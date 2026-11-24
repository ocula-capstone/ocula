export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  retryAfter?: number; // seconds, from the Retry-After header

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    retryAfter?: number,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}

interface AuthHooks {
  getAccessToken: () => string | null;
  // Refreshes the session and returns the new access token, or null if it could not.
  refresh: () => Promise<string | null>;
}

let hooks: AuthHooks = { getAccessToken: () => null, refresh: async () => null };

export const configureClient = (next: AuthHooks) => {
  hooks = next;
};

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  // false for endpoints that must not send a token or trigger a refresh (login, refresh, ...)
  auth?: boolean;
}

// Backend address without /api; empty means same origin, exactly as before.
// A trailing /api is stripped too, so a mistyped env value cannot produce /api/api/...
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '').replace(/\/api$/, '');

export async function api<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const send = (token: string | null) =>
    fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let res = await send(auth ? hooks.getAccessToken() : null);

  if (res.status === 401 && auth) {
    const token = await hooks.refresh();
    if (token) res = await send(token);
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'unknown_error',
      data?.error?.message ?? 'Something went wrong',
      data?.error?.fields,
      Number(res.headers.get('Retry-After')) || undefined,
    );
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}
