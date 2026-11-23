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

  const login = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

  beforeEach(async () => {
    db = createFakePrisma();
    sent = [];
    db.addUser({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'staff@mrb.test',
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
      .send({ email: 'not-an-email' })
      .expect(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'email',
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
});
