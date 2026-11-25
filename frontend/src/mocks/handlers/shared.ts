import { delay, HttpResponse } from 'msw';
import { users } from '@/mocks/data/users';

// Helpers shared by every mock handler file.

// A short pause so loading states are visible, like a real network.
export const wait = () => delay(300 + Math.random() * 300);

export const error = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) => HttpResponse.json({ error: { code, message, ...(fields && { fields }) } }, { status });

export const validation = (fields: Record<string, string>) =>
  error(422, 'validation_failed', 'Validation failed', fields);

// Each check maps a field to its error message, or false when the field is fine.
// Returns the 422 response when any check failed, otherwise null.
export function validate(checks: Record<string, string | false>) {
  const fields = Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
  return Object.keys(fields).length ? validation(fields as Record<string, string>) : null;
}

export const passwordTooShort = (password: string) =>
  password.length < 8 && 'Use at least 8 characters';

export const unauthorized = () => error(401, 'unauthorized', 'Missing or invalid access token');

// The signed-in user for a request, read from its "Authorization: Bearer access-<id>" header.
// A token sent without the Bearer prefix is rejected, as the real server does.
export function authedUser(request: Request) {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length);
  return users.find((u) => `access-${u.id}` === token);
}

export const body = async (request: Request) =>
  ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

export const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
