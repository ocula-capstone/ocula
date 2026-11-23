import { delay, http, HttpResponse } from 'msw';

type Role = 'staff' | 'optometrist' | 'patient';

interface MockUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
}

const users: MockUser[] = [
  {
    id: 'u-staff',
    email: 'staff@ocula.test',
    password: 'password123',
    fullName: 'Sam Staff',
    role: 'staff',
    mustChangePassword: false,
  },
  {
    id: 'u-doctor',
    email: 'doctor@ocula.test',
    password: 'password123',
    fullName: 'Dr. Olivia Optometrist',
    role: 'optometrist',
    mustChangePassword: false,
  },
  {
    id: 'u-patient',
    email: 'patient@ocula.test',
    password: 'password123',
    fullName: 'Pat Patient',
    role: 'patient',
    mustChangePassword: false,
  },
];

// refresh token -> user id; one-time use, rotated on every refresh.
// Kept in localStorage so a page reload does not forget issued tokens (the real API stores them).
const TOKENS_KEY = 'ocula.mock.refreshTokens';
const refreshTokens = new Map<string, string>(
  JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '[]') as [string, string][],
);
const saveTokens = () => localStorage.setItem(TOKENS_KEY, JSON.stringify([...refreshTokens]));

const publicUser = (user: MockUser) => {
  const copy: Partial<MockUser> = { ...user };
  delete copy.password;
  return copy;
};

const wait = () => delay(300 + Math.random() * 300);

const error = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json({ error: { code, message, ...(fields && { fields }) } }, { status });

const validation = (fields: Record<string, string>) =>
  error(422, 'validation_failed', 'Validation failed', fields);

const unauthorized = () => error(401, 'unauthorized', 'Missing or invalid access token');

function issueTokens(user: MockUser) {
  const refreshToken = `refresh-${user.id}-${crypto.randomUUID()}`;
  refreshTokens.set(refreshToken, user.id);
  saveTokens();
  return { accessToken: `access-${user.id}`, refreshToken, expiresIn: 900 };
}

function authedUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  return users.find((u) => `access-${u.id}` === token);
}

const body = async (request: Request) =>
  ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
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
    return HttpResponse.json({ ...issueTokens(user), user: publicUser(user) });
  }),

  http.post('/api/auth/refresh', async ({ request }) => {
    await wait();
    const b = await body(request);
    const token = str(b.refreshToken);
    const userId = refreshTokens.get(token);
    const user = users.find((u) => u.id === userId);
    if (!user) return error(401, 'invalid_refresh_token', 'Invalid refresh token');
    refreshTokens.delete(token);
    return HttpResponse.json(issueTokens(user)); // issueTokens saves
  }),

  http.post('/api/auth/logout', async ({ request }) => {
    await wait();
    const b = await body(request);
    refreshTokens.delete(str(b.refreshToken));
    saveTokens();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/auth/me', async ({ request }) => {
    await wait();
    const user = authedUser(request);
    return user ? HttpResponse.json(publicUser(user)) : unauthorized();
  }),

  http.post('/api/auth/register', async ({ request }) => {
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
    };
    users.push(user);
    return HttpResponse.json({ ...issueTokens(user), user: publicUser(user) }, { status: 201 });
  }),

  http.post('/api/auth/forgot-password', async () => {
    await wait();
    return HttpResponse.json(
      { message: 'If that email has an account, a reset link is on its way.' },
      { status: 202 },
    );
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
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

  http.post('/api/auth/change-password', async ({ request }) => {
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
