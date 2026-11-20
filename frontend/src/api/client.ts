export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
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

export async function api<T>(
  path: string,
  { method = 'GET', body, auth = true }: RequestOptions = {},
): Promise<T> {
  const send = (token: string | null) =>
    fetch(`/api${path}`, {
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
    );
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}
