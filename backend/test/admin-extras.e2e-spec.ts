import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';

describe('Admin extras (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let admin: { Authorization: string };
  let staff: { Authorization: string };
  let adminId: string;
  let staffId: string;

  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    db = createFakePrisma();
    db.addBranch({ id: PASAY, code: 'PASAY', name: 'MRB Pasay' });
    adminId = db.addUser({
      email: 'admin@mrb.test',
      passwordHash: await hashPassword('admin-password'),
      fullName: 'Clinic Admin',
      role: 'admin',
    }).id;
    staffId = db.addUser(
      {
        email: 'staff@mrb.test',
        passwordHash: await hashPassword('staff-password'),
        fullName: 'Ana Staff',
        role: 'staff',
      },
      [PASAY],
    ).id;
    app = await createTestApp(db);
    admin = await bearer(app, 'admin@mrb.test', 'admin-password');
    staff = await bearer(app, 'staff@mrb.test', 'staff-password');
  });

  afterEach(async () => {
    await app.close();
  });

  describe('clinic settings', () => {
    it('starts with the defaults and staff can read them', async () => {
      const res = await http().get('/api/settings').set(staff).expect(200);
      expect(res.body).toMatchObject({
        recallIntervalMonths: 12,
        recallWindowDays: 30,
        lowStockThreshold: 3,
        forcePasswordChange: true,
      });
    });

    it('only the admin can change them, within limits', async () => {
      await http()
        .patch('/api/settings')
        .set(staff)
        .send({ lowStockThreshold: 5 })
        .expect(403);

      const bad = await http()
        .patch('/api/settings')
        .set(admin)
        .send({ recallIntervalMonths: 7, recallWindowDays: 0 })
        .expect(422);
      expect(Object.keys(bad.body.error.fields).sort()).toEqual([
        'recallIntervalMonths',
        'recallWindowDays',
      ]);

      const ok = await http()
        .patch('/api/settings')
        .set(admin)
        .send({ recallIntervalMonths: 6, lowStockThreshold: 5 })
        .expect(200);
      expect(ok.body).toMatchObject({
        recallIntervalMonths: 6,
        lowStockThreshold: 5,
      });

      const entry = db.auditLogs.find((a) => a.action === 'settings.update');
      expect(entry?.userId).toBe(adminId);
      expect(entry?.data).toEqual({
        recallIntervalMonths: { from: 12, to: 6 },
        lowStockThreshold: { from: 3, to: 5 },
      });
    });

    it('new staff skip the forced password change when the setting is off', async () => {
      await http()
        .patch('/api/settings')
        .set(admin)
        .send({ forcePasswordChange: false })
        .expect(200);
      const res = await http()
        .post('/api/users')
        .set(admin)
        .send({
          email: 'new@mrb.test',
          fullName: 'New',
          role: 'staff',
          branchIds: [PASAY],
        })
        .expect(201);
      expect(res.body.user.mustChangePassword).toBe(false);
    });
  });

  it('online booking can be switched off per branch, and it is logged', async () => {
    const res = await http()
      .patch(`/api/branches/${PASAY}`)
      .set(admin)
      .send({ onlineBookingEnabled: false })
      .expect(200);
    expect(res.body.onlineBookingEnabled).toBe(false);

    const list = await http().get('/api/branches').set(staff).expect(200);
    expect(list.body[0].onlineBookingEnabled).toBe(false);

    const entry = db.auditLogs.find(
      (a) => a.action === 'branch.booking_toggle',
    );
    expect(entry?.data).toEqual({
      onlineBookingEnabled: { from: true, to: false },
    });
  });

  describe('editing an email', () => {
    it('changes it, and the person logs in with the new one', async () => {
      const res = await http()
        .patch(`/api/users/${staffId}`)
        .set(admin)
        .send({ email: ' Ana.New@Mrb.test ' })
        .expect(200);
      expect(res.body.email).toBe('ana.new@mrb.test');
      await http()
        .post('/api/auth/login')
        .send({ email: 'ana.new@mrb.test', password: 'staff-password' })
        .expect(200);
    });

    it("refuses someone else's email", async () => {
      const res = await http()
        .patch(`/api/users/${staffId}`)
        .set(admin)
        .send({ email: 'admin@mrb.test' })
        .expect(409);
      expect(res.body.error.code).toBe('email_taken');
    });

    it('the admin can change its own email but not its role', async () => {
      await http()
        .patch(`/api/users/${adminId}`)
        .set(admin)
        .send({ email: 'owner@mrb.test' })
        .expect(200);
      await http()
        .patch(`/api/users/${adminId}`)
        .set(admin)
        .send({ role: 'staff' })
        .expect(403);
    });
  });

  describe('audit log', () => {
    it('lists entries with filters', async () => {
      await http()
        .post('/api/users')
        .set(admin)
        .send({
          email: 'bea@mrb.test',
          fullName: 'Bea',
          role: 'optometrist',
          branchIds: [PASAY],
        })
        .expect(201);
      await http()
        .patch(`/api/users/${staffId}`)
        .set(admin)
        .send({ isActive: false })
        .expect(200);
      await http()
        .post(`/api/users/${staffId}/reset-password`)
        .set(admin)
        .expect(200);

      const all = await http().get('/api/audit-logs').set(admin).expect(200);
      const actions = all.body.items.map((i: { action: string }) => i.action);
      expect(actions).toEqual(
        expect.arrayContaining([
          'auth.login',
          'user.create',
          'user.disable',
          'user.reset_password',
        ]),
      );
      expect(all.body.items[0].user).toMatchObject({ email: 'admin@mrb.test' });
      expect(JSON.stringify(all.body)).not.toMatch(/password"?\s*:/i);

      const users = await http()
        .get('/api/audit-logs?action=user.')
        .set(admin)
        .expect(200);
      expect(
        users.body.items.every((i: { action: string }) =>
          i.action.startsWith('user.'),
        ),
      ).toBe(true);

      const forStaff = await http()
        .get(`/api/audit-logs?entityId=${staffId}`)
        .set(admin)
        .expect(200);
      expect(
        forStaff.body.items.map((i: { action: string }) => i.action).sort(),
      ).toEqual(['auth.login', 'user.disable', 'user.reset_password']);
    });

    it('patients signing in are not logged', async () => {
      await http()
        .post('/api/auth/register')
        .send({
          email: 'pat@mrb.test',
          password: 'patient-pass',
          fullName: 'Pat',
        })
        .expect(201);
      await http()
        .post('/api/auth/login')
        .send({ email: 'pat@mrb.test', password: 'patient-pass' })
        .expect(200);
      expect(
        db.auditLogs.filter((a) => a.action === 'auth.login'),
      ).toHaveLength(2); // admin + staff from setup
    });

    it('staff cannot read it', async () => {
      await http().get('/api/audit-logs').set(staff).expect(403);
    });
  });
});
