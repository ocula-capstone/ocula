import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from './../src/common/password.js';
import type { MailMessage } from './../src/mail/mail.service.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { createTestApp } from './test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let sent: MailMessage[];

  const login = (identifier: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier, password });

  beforeEach(async () => {
    db = createFakePrisma();
    sent = [];
    db.addUser({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'staff@mrb.test',
      phone: '+639171234567',
      passwordHash: await hashPassword('staff-password'),
      fullName: 'Maria Santos',
      role: 'staff',
      mustChangePassword: true,
      isActive: true,
    });

    app = await createTestApp(db, sent);
  });

  afterEach(async () => {
    await app.close();
  });

  it('logs in with the right password (email is case-insensitive)', async () => {
    const res = await login('  STAFF@mrb.test ', 'staff-password').expect(200);
    expect(res.body).toMatchObject({
      expiresIn: 900,
      user: {
        email: 'staff@mrb.test',
        role: 'staff',
        mustChangePassword: true,
      },
    });
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password and an unknown email the same way', async () => {
    const wrong = await login('staff@mrb.test', 'nope').expect(401);
    const unknown = await login('ghost@mrb.test', 'nope').expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.error.code).toBe('invalid_credentials');
  });

  it('tells a disabled account only after the right password', async () => {
    db.users[0].isActive = false;
    const right = await login('staff@mrb.test', 'staff-password').expect(403);
    expect(right.body.error.code).toBe('account_disabled');
    const wrong = await login('staff@mrb.test', 'nope').expect(401);
    expect(wrong.body.error.code).toBe('invalid_credentials');
  });

  it('validates the login body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'identifier',
      'password',
    ]);
  });

  it('GET /me needs a valid access token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);

    const { body } = await login('staff@mrb.test', 'staff-password');
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200);
    expect(me.body).toEqual(body.user);
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const { body: first } = await login('staff@mrb.test', 'staff-password');

    const second = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);
    expect(second.body.refreshToken).not.toBe(first.refreshToken);

    // Using the old token again: rejected, and the newer token is revoked too.
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    const after = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: second.body.refreshToken })
      .expect(401);
    expect(after.body.error.code).toBe('invalid_refresh_token');
  });

  it('logout ends the session', async () => {
    const { body } = await login('staff@mrb.test', 'staff-password');
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .send({ refreshToken: body.refreshToken })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: body.refreshToken })
      .expect(401);
  });

  it('registers a patient and refuses a taken email', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '09170000001',
        birthDate: '1990-01-01',
        email: 'Juan@Example.com',
        password: 'patient-pass',
        fullName: ' Juan Dela Cruz ',
      })
      .expect(201);
    expect(res.body.user).toMatchObject({
      email: 'juan@example.com',
      fullName: 'Juan Dela Cruz',
      role: 'patient',
      mustChangePassword: false,
    });
    expect(db.patients).toHaveLength(1);

    const again = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '09170000002',
        birthDate: '1990-01-01',
        email: 'juan@example.com',
        password: 'patient-pass',
        fullName: 'Juan',
      })
      .expect(409);
    expect(again.body.error.code).toBe('email_taken');
  });

  it('register ignores a role sent by the client', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '09170000003',
        birthDate: '1990-01-01',
        email: 'sneaky@example.com',
        password: 'patient-pass',
        fullName: 'X',
        role: 'admin',
      })
      .expect(201);
    expect(res.body.user.role).toBe('patient');
  });

  it('changes the password and clears mustChangePassword', async () => {
    const { body } = await login('staff@mrb.test', 'staff-password');
    const auth = { Authorization: `Bearer ${body.accessToken}` };

    const wrong = await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'nope', newPassword: 'new-password-1' })
      .expect(403);
    expect(wrong.body.error.code).toBe('wrong_current_password');

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(auth)
      .send({
        currentPassword: 'staff-password',
        newPassword: 'new-password-1',
      })
      .expect(204);

    await login('staff@mrb.test', 'staff-password').expect(401);
    const relogin = await login('staff@mrb.test', 'new-password-1').expect(200);
    expect(relogin.body.user.mustChangePassword).toBe(false);
  });

  it('keeps the health check public', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('changing the password logs out other sessions but keeps this one', async () => {
    const { body: phone } = await login('staff@mrb.test', 'staff-password');
    const { body: laptop } = await login('staff@mrb.test', 'staff-password');

    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${laptop.accessToken}`)
      .send({
        currentPassword: 'staff-password',
        newPassword: 'new-password-1',
      })
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: phone.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: laptop.refreshToken })
      .expect(200);
  });

  describe('forgot and reset password', () => {
    const tokenFrom = (message: MailMessage) =>
      decodeURIComponent(/token=(\S+)/.exec(message.text)?.[1] ?? '');

    it('answers 202 the same way for unknown emails and sends nothing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@mrb.test' })
        .expect(202);
      expect(res.body.message).toEqual(expect.any(String));
      expect(sent).toHaveLength(0);
    });

    it('emails a one-time link that resets the password and logs out everywhere', async () => {
      const { body: session } = await login('staff@mrb.test', 'staff-password');

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'STAFF@mrb.test' })
        .expect(202);
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('staff@mrb.test');
      expect(sent[0].text).toContain(
        'http://localhost:5173/reset-password?token=',
      );
      const token = tokenFrom(sent[0]);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'brand-new-pass' })
        .expect(204);

      // The link works only once.
      const again = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'another-pass-1' })
        .expect(400);
      expect(again.body.error.code).toBe('invalid_or_expired_token');

      await login('staff@mrb.test', 'staff-password').expect(401);
      const relogin = await login('staff@mrb.test', 'brand-new-pass').expect(
        200,
      );
      expect(relogin.body.user.mustChangePassword).toBe(false);
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('only the newest link works, and expired links are refused', async () => {
      const forgot = () =>
        request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'staff@mrb.test' })
          .expect(202);
      await forgot();
      await forgot();
      const [older, newer] = sent.map(tokenFrom);

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: older, newPassword: 'brand-new-pass' })
        .expect(400);

      db.passwordResetTokens[db.passwordResetTokens.length - 1].expiresAt =
        new Date(Date.now() - 1000);
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: newer, newPassword: 'brand-new-pass' })
        .expect(400);
    });
  });

  describe('accounts v2', () => {
    it.each(['09171234567', '9171234567', '+639171234567', '0917 123 4567'])(
      'logs in by phone written as %s',
      async (phone) => {
        const res = await login(phone, 'staff-password').expect(200);
        expect(res.body.user).toMatchObject({
          email: 'staff@mrb.test',
          phone: '+639171234567',
        });
      },
    );

    it('still accepts the old { email } login body', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'staff@mrb.test', password: 'staff-password' })
        .expect(200);
    });

    it('rejects an identifier that is neither an email nor a phone', async () => {
      const res = await login('12345', 'staff-password').expect(422);
      expect(res.body.error.fields.identifier).toBeDefined();
    });

    it('registers with a phone and no email, and saves the patient file', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Lola Rosa',
          phone: '0918 765 4321',
          password: 'patient-pass',
          birthDate: '1950-03-15',
          sex: 'female',
        })
        .expect(201);
      expect(res.body.user).toMatchObject({
        email: null,
        phone: '+639187654321',
        role: 'patient',
        mustChangePassword: false,
        branches: [],
      });
      expect(db.patients[0]).toMatchObject({
        fullName: 'Lola Rosa',
        phone: '+639187654321',
        sex: 'female',
        userId: res.body.user.id,
      });
      expect(
        (db.patients[0].birthDate as Date).toISOString().slice(0, 10),
      ).toBe('1950-03-15');

      await login('09187654321', 'patient-pass').expect(200);
    });

    it('refuses a phone already used by any account', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Copy',
          phone: '09171234567',
          password: 'patient-pass',
          birthDate: '1990-01-01',
        })
        .expect(409);
      expect(res.body.error).toMatchObject({
        code: 'phone_taken',
        fields: { phone: expect.any(String) },
      });
    });

    it('validates phone, birth date and sex', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'X',
          phone: '12345',
          password: 'patient-pass',
          birthDate: 'soon',
          sex: 'x',
        })
        .expect(422);
      expect(Object.keys(res.body.error.fields).sort()).toEqual([
        'birthDate',
        'phone',
        'sex',
      ]);

      const future = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'X',
          phone: '09170000099',
          password: 'patient-pass',
          birthDate: '2999-01-01',
        })
        .expect(422);
      expect(future.body.error.fields.birthDate).toBeDefined();
    });

    it('/me returns phone and branches', async () => {
      const { body } = await login('staff@mrb.test', 'staff-password');
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`)
        .expect(200);
      expect(me.body).toMatchObject({ phone: '+639171234567', branches: [] });
    });
  });

  describe('rate limiting', () => {
    it('locks an account after 5 wrong passwords with 429 too_many_attempts', async () => {
      for (let i = 0; i < 4; i++)
        await login('staff@mrb.test', 'wrong').expect(401);
      await login('09171234567', 'wrong').expect(401); // same account, by phone
      const locked = await login('staff@mrb.test', 'staff-password').expect(
        429,
      );
      expect(locked.body.error.code).toBe('too_many_attempts');
      expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('a successful login resets the count', async () => {
      for (let i = 0; i < 4; i++)
        await login('staff@mrb.test', 'wrong').expect(401);
      await login('staff@mrb.test', 'staff-password').expect(200);
      for (let i = 0; i < 4; i++)
        await login('staff@mrb.test', 'wrong').expect(401);
      await login('staff@mrb.test', 'staff-password').expect(200);
    });

    it('limits forgot-password requests from one address', async () => {
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/forgot-password')
          .send({ email: 'staff@mrb.test' })
          .expect(i < 9 ? 202 : 202);
      }
      const res = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'staff@mrb.test' })
        .expect(429);
      expect(res.body.error.code).toBe('too_many_attempts');
    });
  });
});
