import { http, HttpResponse } from 'msw';
import { readSavedList } from '@/mocks/data/storage';
import { addRegisteredUser, toApiUser, users, type MockUser } from '@/mocks/data/users';
import {
  authedUser,
  body,
  error,
  str,
  unauthorized,
  validation,
  wait,
} from '@/mocks/handlers/shared';

// refresh token -> user id; one-time use, rotated on every refresh.
// Kept in localStorage so a page reload does not forget issued tokens (the real API stores them).
const TOKENS_KEY = 'ocula.mock.refreshTokens';
const isTokenEntry = (entry: unknown): entry is [string, string] =>
  Array.isArray(entry) &&
  entry.length === 2 &&
  typeof entry[0] === 'string' &&
  typeof entry[1] === 'string';
const refreshTokens = new Map<string, string>(readSavedList(TOKENS_KEY).filter(isTokenEntry));
const saveTokens = () => localStorage.setItem(TOKENS_KEY, JSON.stringify([...refreshTokens]));

function issueTokens(user: MockUser) {
  const refreshToken = `refresh-${user.id}-${crypto.randomUUID()}`;
  refreshTokens.set(refreshToken, user.id);
  saveTokens();
  return { accessToken: `access-${user.id}`, refreshToken, expiresIn: 900 };
}

export const authHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    await wait();
    const b = await body(request);
    const email = str(b.email).toLowerCase();
    const password = str(b.password);
    const fields: Record<string, string> = {};
    if (!email) fields.email = 'Email is required';
    if (!password) fields.password = 'Password is required';
    if (Object.keys(fields).length) return validation(fields);

    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) return error(401, 'invalid_credentials', 'Incorrect email or password');
    return HttpResponse.json({ ...issueTokens(user), user: toApiUser(user) });
  }),

  http.post('*/api/auth/refresh', async ({ request }) => {
    await wait();
    const b = await body(request);
    const token = str(b.refreshToken);
    const userId = refreshTokens.get(token);
    const user = users.find((u) => u.id === userId);
    if (!user) return error(401, 'invalid_refresh_token', 'Invalid refresh token');
    refreshTokens.delete(token);
    return HttpResponse.json(issueTokens(user)); // issueTokens saves
  }),

  http.post('*/api/auth/logout', async ({ request }) => {
    await wait();
    const b = await body(request);
    refreshTokens.delete(str(b.refreshToken));
    saveTokens();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/auth/me', async ({ request }) => {
    await wait();
    const user = authedUser(request);
    return user ? HttpResponse.json(toApiUser(user)) : unauthorized();
  }),

  http.post('*/api/auth/register', async ({ request }) => {
    await wait();
    const b = await body(request);
    const email = str(b.email).toLowerCase();
    const password = str(b.password);
    const fullName = str(b.fullName);
    const fields: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) fields.email = 'Enter a valid email';
    if (password.length < 8) fields.password = 'Password must be at least 8 characters';
    if (!fullName) fields.fullName = 'Full name is required';
    if (Object.keys(fields).length) return validation(fields);

    if (users.some((u) => u.email === email)) {
      return error(409, 'email_taken', 'Email is already registered');
    }
    const user: MockUser = {
      id: `u-${crypto.randomUUID()}`,
      email,
      password,
      fullName,
      role: 'patient',
      mustChangePassword: false,
      branchIds: [],
    };
    addRegisteredUser(user);
    return HttpResponse.json({ ...issueTokens(user), user: toApiUser(user) }, { status: 201 });
  }),

  http.post('*/api/auth/forgot-password', async () => {
    await wait();
    return HttpResponse.json(
      { message: 'If that email has an account, a reset link is on its way.' },
      { status: 202 },
    );
  }),

  http.post('*/api/auth/reset-password', async ({ request }) => {
    await wait();
    const b = await body(request);
    const token = str(b.token);
    const newPassword = str(b.newPassword);
    const fields: Record<string, string> = {};
    if (!token) fields.token = 'Token is required';
    if (newPassword.length < 8) fields.newPassword = 'Password must be at least 8 characters';
    if (Object.keys(fields).length) return validation(fields);

    if (token !== 'valid-token') {
      return error(400, 'invalid_or_expired_token', 'Reset link is invalid or has expired');
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/api/auth/change-password', async ({ request }) => {
    await wait();
    const user = authedUser(request);
    if (!user) return unauthorized();
    const b = await body(request);
    const currentPassword = str(b.currentPassword);
    const newPassword = str(b.newPassword);
    const fields: Record<string, string> = {};
    if (!currentPassword) fields.currentPassword = 'Current password is required';
    if (newPassword.length < 8) fields.newPassword = 'Password must be at least 8 characters';
    if (Object.keys(fields).length) return validation(fields);

    if (currentPassword !== user.password) {
      return error(403, 'wrong_current_password', 'Current password is incorrect');
    }
    user.password = newPassword;
    user.mustChangePassword = false;
    return new HttpResponse(null, { status: 204 });
  }),
];
