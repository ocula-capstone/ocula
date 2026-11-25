import { http, HttpResponse } from 'msw';
import { isBirthDate } from '@/lib/dates';
import { normalizePhone } from '@/lib/phone';
import { readSavedList, writeSavedList } from '@/mocks/data/storage';
import { addRegisteredUser, saveUsers, toApiUser, users, type MockUser } from '@/mocks/data/users';
import {
  authedUser,
  body,
  error,
  passwordTooShort,
  str,
  unauthorized,
  validate,
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
const saveTokens = () => writeSavedList(TOKENS_KEY, [...refreshTokens]);

function issueTokens(user: MockUser) {
  const refreshToken = `refresh-${user.id}-${crypto.randomUUID()}`;
  refreshTokens.set(refreshToken, user.id);
  saveTokens();
  return { accessToken: `access-${user.id}`, refreshToken, expiresIn: 900 };
}

// What login and register return: fresh tokens plus the user.
const authResponse = (user: MockUser) => ({ ...issueTokens(user), user: toApiUser(user) });

export const authHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    await wait();
    const b = await body(request);
    // An email or a mobile number, as in the real API.
    const identifier = str(b.identifier).toLowerCase();
    const phone = normalizePhone(identifier);
    const password = str(b.password);
    const invalid = validate({
      identifier: !identifier && 'Enter your email or mobile number',
      password: !password && 'Password is required',
    });
    if (invalid) return invalid;

    const user = users.find(
      (u) => (u.email === identifier || (phone && u.phone === phone)) && u.password === password,
    );
    if (!user) {
      return error(401, 'invalid_credentials', 'Incorrect email, mobile number or password');
    }
    return HttpResponse.json(authResponse(user));
  }),

  http.post('*/api/auth/refresh', async ({ request }) => {
    await wait();
    const b = await body(request);
    const token = str(b.refreshToken);
    const userId = refreshTokens.get(token);
    const user = users.find((u) => u.id === userId);
    if (!user) return error(401, 'invalid_refresh_token', 'Invalid refresh token');
    refreshTokens.delete(token);
    // issueTokens saves the token list, so no saveTokens() here.
    return HttpResponse.json(issueTokens(user));
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
    const phone = normalizePhone(b.phone);
    const invalid = validate({
      email: !/^\S+@\S+\.\S+$/.test(email) && 'Enter a valid email address',
      phone: !phone && 'Enter a valid mobile number',
      birthDate: !isBirthDate(str(b.birthDate)) && 'Enter a date in the past',
      password: passwordTooShort(password),
      fullName: !fullName && 'Full name is required',
    });
    if (invalid) return invalid;

    if (users.some((u) => u.email === email)) {
      return error(409, 'email_taken', 'Email is already registered');
    }
    if (users.some((u) => u.phone === phone)) {
      return error(409, 'phone_taken', 'Mobile number is already registered');
    }
    const user: MockUser = {
      id: `u-${crypto.randomUUID()}`,
      email,
      phone,
      password,
      fullName,
      role: 'patient',
      mustChangePassword: false,
      branchIds: [],
    };
    addRegisteredUser(user);
    return HttpResponse.json(authResponse(user), { status: 201 });
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
    const invalid = validate({
      token: !token && 'Token is required',
      newPassword: passwordTooShort(newPassword),
    });
    if (invalid) return invalid;

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
    const invalid = validate({
      currentPassword: !currentPassword && 'Current password is required',
      newPassword: passwordTooShort(newPassword),
    });
    if (invalid) return invalid;

    if (currentPassword !== user.password) {
      return error(403, 'wrong_current_password', 'Current password is incorrect');
    }
    user.password = newPassword;
    user.mustChangePassword = false;
    saveUsers();
    return new HttpResponse(null, { status: 204 });
  }),
];
