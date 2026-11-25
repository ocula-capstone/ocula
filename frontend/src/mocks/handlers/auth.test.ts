import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { authHandlers } from '@/mocks/handlers/auth';

// No artificial network delay in tests.
vi.mock('@/mocks/handlers/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/handlers/shared')>()),
  wait: async () => undefined,
}));

const server = setupServer(...authHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

interface CallOptions {
  body?: unknown;
  token?: string;
  method?: 'GET' | 'POST';
}

async function call(path: string, { body, token, method = 'POST' }: CallOptions = {}) {
  const res = await fetch(`http://localhost/api/auth/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : undefined };
}

const loginAs = (identifier: string, password = 'password123') =>
  call('login', { body: { identifier, password } });

const changePassword = (token: string, currentPassword: string, newPassword: string) =>
  call('change-password', { body: { currentPassword, newPassword }, token });

// A new patient every time, so tests never collide on email or phone.
let seq = 0;
const newPatient = (overrides: Record<string, unknown> = {}) => {
  seq += 1;
  return {
    fullName: 'Test Patient',
    email: `patient${seq}@example.com`,
    phone: `0917${1000000 + seq}`,
    birthDate: '1990-05-21',
    password: 'password123',
    ...overrides,
  };
};

describe('login', () => {
  it('works with an email and with a phone typed in any accepted way', async () => {
    const patient = newPatient({ phone: '09175550001' });
    expect((await call('register', { body: patient })).status).toBe(201);

    for (const identifier of [patient.email, '09175550001', '9175550001', '+63 917-555-0001']) {
      const res = await loginAs(identifier);
      expect(res.status).toBe(200);
      expect(res.json.user.phone).toBe('+639175550001');
      expect(res.json.accessToken).toBeTruthy();
    }
  });

  it('refuses a wrong password and an unknown account the same way', async () => {
    for (const res of [
      await loginAs('staff@ocula.test', 'wrong-password'),
      await loginAs('nobody@example.com'),
    ]) {
      expect(res.status).toBe(401);
      expect(res.json.error.code).toBe('invalid_credentials');
    }
  });

  it('asks for both boxes', async () => {
    const res = await call('login', { body: {} });
    expect(res.status).toBe(422);
    expect(Object.keys(res.json.error.fields).sort()).toEqual(['identifier', 'password']);
  });
});

describe('register', () => {
  it('creates a patient who is never forced to change the password', async () => {
    const res = await call('register', { body: newPatient() });
    expect(res.status).toBe(201);
    expect(res.json.user.role).toBe('patient');
    expect(res.json.user.mustChangePassword).toBe(false);
  });

  it('needs a real date of birth in the past', async () => {
    for (const birthDate of [undefined, '', '2001-02-30', '2999-01-01']) {
      const res = await call('register', { body: newPatient({ birthDate }) });
      expect(res.status).toBe(422);
      expect(Object.keys(res.json.error.fields)).toEqual(['birthDate']);
    }
  });

  it('needs a mobile phone, a valid email, a name and 8+ characters', async () => {
    const res = await call('register', {
      body: {
        fullName: '',
        email: 'nope',
        phone: '123',
        birthDate: '1990-05-21',
        password: 'short',
      },
    });
    expect(res.status).toBe(422);
    expect(Object.keys(res.json.error.fields).sort()).toEqual([
      'email',
      'fullName',
      'password',
      'phone',
    ]);
    expect(res.json.error.fields.password).toBe('Use at least 8 characters');
  });

  it('refuses an email or a phone that is already registered', async () => {
    const first = newPatient({ phone: '09175550002' });
    await call('register', { body: first });

    const sameEmail = await call('register', { body: newPatient({ email: first.email }) });
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.json.error.code).toBe('email_taken');

    const samePhone = await call('register', { body: newPatient({ phone: '+63 917 555 0002' }) });
    expect(samePhone.status).toBe(409);
    expect(samePhone.json.error.code).toBe('phone_taken');
  });
});

describe('sessions', () => {
  it('/me needs a token and returns that user', async () => {
    expect((await call('me', { method: 'GET' })).status).toBe(401);

    const login = await loginAs('staff@ocula.test');
    const me = await call('me', { method: 'GET', token: login.json.accessToken });
    expect(me.status).toBe(200);
    expect(me.json.email).toBe('staff@ocula.test');
    expect(me.json.branches).toHaveLength(1);
  });

  it('a refresh token works once, then it is replaced', async () => {
    const { refreshToken } = (await loginAs('staff@ocula.test')).json;
    expect((await call('refresh', { body: { refreshToken } })).status).toBe(200);

    const reused = await call('refresh', { body: { refreshToken } });
    expect(reused.status).toBe(401);
    expect(reused.json.error.code).toBe('invalid_refresh_token');
  });

  it('logout ends the session', async () => {
    const { refreshToken } = (await loginAs('staff@ocula.test')).json;
    expect((await call('logout', { body: { refreshToken } })).status).toBe(204);
    expect((await call('refresh', { body: { refreshToken } })).status).toBe(401);
  });
});

describe('change and reset password', () => {
  it('a temporary password is changed once: old stops working, flag clears', async () => {
    const login = await loginAs('doctor.temp@ocula.test');
    expect(login.json.user.mustChangePassword).toBe(true);
    const token = login.json.accessToken;

    const wrong = await changePassword(token, 'nope', 'new-pass-123');
    expect(wrong.status).toBe(403);
    expect(wrong.json.error.code).toBe('wrong_current_password');

    expect((await changePassword(token, 'password123', 'short')).status).toBe(422);
    expect((await changePassword(token, 'password123', 'new-pass-123')).status).toBe(204);

    expect((await loginAs('doctor.temp@ocula.test')).status).toBe(401);
    const again = await loginAs('doctor.temp@ocula.test', 'new-pass-123');
    expect(again.status).toBe(200);
    expect(again.json.user.mustChangePassword).toBe(false);
  });

  it('change-password needs a signed-in user', async () => {
    const res = await call('change-password', {
      body: { currentPassword: 'a', newPassword: 'longenough1' },
    });
    expect(res.status).toBe(401);
  });

  it('reset-password accepts only the valid token and 8+ characters', async () => {
    const reset = (token: string, newPassword: string) =>
      call('reset-password', { body: { token, newPassword } });

    expect((await reset('valid-token', 'longenough1')).status).toBe(204);
    const expired = await reset('expired', 'longenough1');
    expect(expired.status).toBe(400);
    expect(expired.json.error.code).toBe('invalid_or_expired_token');
    expect((await reset('valid-token', 'short')).status).toBe(422);
  });
});
