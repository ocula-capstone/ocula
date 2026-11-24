import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';
const TAGUIG = '22222222-2222-4222-8222-222222222222';

describe('Users and branches (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let admin: { Authorization: string };
  let adminId: string;

  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    db = createFakePrisma();
    db.addBranch({ id: PASAY, code: 'PASAY', name: 'MRB Pasay' });
    db.addBranch({ id: TAGUIG, code: 'TAGUIG', name: 'MRB Taguig' });
    adminId = db.addUser({
      email: 'admin@mrb.test',
      passwordHash: await hashPassword('admin-password'),
      fullName: 'Clinic Admin',
      role: 'admin',
    }).id;
    db.addUser(
      {
        email: 'staff@mrb.test',
        passwordHash: await hashPassword('staff-password'),
        fullName: 'Ana Staff',
        role: 'staff',
      },
      [PASAY],
    );
    app = await createTestApp(db);
    admin = await bearer(app, 'admin@mrb.test', 'admin-password');
  });

  afterEach(async () => {
    await app.close();
  });

  it('only the admin can manage users', async () => {
    const staff = await bearer(app, 'staff@mrb.test', 'staff-password');
    const res = await http().get('/api/users').set(staff).expect(403);
    expect(res.body.error.code).toBe('forbidden');
    await http().get('/api/users').expect(401);
  });

  it('creates a staff account with a one-time temporary password', async () => {
    const res = await http()
      .post('/api/users')
      .set(admin)
      .send({
        phone: '09170000004',
        email: ' Maria@Gmail.com ',
        fullName: 'Maria Santos',
        role: 'optometrist',
        branchIds: [PASAY, TAGUIG],
      })
      .expect(201);

    expect(res.body.user).toMatchObject({
      email: 'maria@gmail.com',
      role: 'optometrist',
      mustChangePassword: true,
      isActive: true,
    });
    expect(res.body.user.branches.map((b: { code: string }) => b.code)).toEqual(
      ['PASAY', 'TAGUIG'],
    );
    expect(res.body.temporaryPassword).toMatch(
      /^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/,
    );
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    // The new person can log in with it and is told to change it.
    const login = await http()
      .post('/api/auth/login')
      .send({ email: 'maria@gmail.com', password: res.body.temporaryPassword })
      .expect(200);
    expect(login.body.user.mustChangePassword).toBe(true);
  });

  it('refuses to create an admin, a duplicate email or an unknown branch', async () => {
    const asAdmin = await http()
      .post('/api/users')
      .set(admin)
      .send({
        phone: '09170000005',
        email: 'x@mrb.test',
        fullName: 'X',
        role: 'admin',
        branchIds: [PASAY],
      })
      .expect(422);
    expect(asAdmin.body.error.fields.role).toBeDefined();

    const dup = await http()
      .post('/api/users')
      .set(admin)
      .send({
        phone: '09170000006',
        email: 'staff@mrb.test',
        fullName: 'X',
        role: 'staff',
        branchIds: [PASAY],
      })
      .expect(409);
    expect(dup.body.error.code).toBe('email_taken');

    const branch = await http()
      .post('/api/users')
      .set(admin)
      .send({
        phone: '09170000007',
        email: 'y@mrb.test',
        fullName: 'Y',
        role: 'staff',
        branchIds: ['33333333-3333-4333-8333-333333333333'],
      })
      .expect(422);
    expect(branch.body.error.fields.branchIds).toBeDefined();
  });

  it('lists with filters and paging', async () => {
    await http()
      .post('/api/users')
      .set(admin)
      .send({
        phone: '09170000008',
        email: 'bea@mrb.test',
        fullName: 'Bea Doctor',
        role: 'optometrist',
        branchIds: [TAGUIG],
      });

    const all = await http().get('/api/users').set(admin).expect(200);
    expect(all.body).toMatchObject({ total: 3, page: 1, pageSize: 20 });
    expect(all.body.items.map((u: { fullName: string }) => u.fullName)).toEqual(
      ['Ana Staff', 'Bea Doctor', 'Clinic Admin'],
    );

    const taguig = await http()
      .get(`/api/users?branchId=${TAGUIG}`)
      .set(admin)
      .expect(200);
    expect(taguig.body.items.map((u: { email: string }) => u.email)).toEqual([
      'bea@mrb.test',
    ]);

    const search = await http()
      .get('/api/users?search=ANA')
      .set(admin)
      .expect(200);
    expect(search.body.total).toBe(1);

    const paged = await http()
      .get('/api/users?page=2&pageSize=2')
      .set(admin)
      .expect(200);
    expect(paged.body.items).toHaveLength(1);

    const inactive = await http()
      .get('/api/users?isActive=false')
      .set(admin)
      .expect(200);
    expect(inactive.body.total).toBe(0);

    const doctors = await http()
      .get('/api/users?role=optometrist')
      .set(admin)
      .expect(200);
    expect(doctors.body.total).toBe(1);
  });

  it('never lists patients', async () => {
    await http()
      .post('/api/auth/register')
      .send({
        phone: '09170000009',
        birthDate: '1990-01-01',
        email: 'pat@mrb.test',
        password: 'patient-pass',
        fullName: 'Pat',
      })
      .expect(201);
    const res = await http().get('/api/users').set(admin).expect(200);
    expect(
      res.body.items.some((u: { role: string }) => u.role === 'patient'),
    ).toBe(false);
    const patientId = db.users.find((u) => u.email === 'pat@mrb.test')!.id;
    await http().get(`/api/users/${patientId}`).set(admin).expect(404);
  });

  it('disabling an account logs it out everywhere and blocks login', async () => {
    const staffLogin = await http()
      .post('/api/auth/login')
      .send({ email: 'staff@mrb.test', password: 'staff-password' })
      .expect(200);
    const staffId = staffLogin.body.user.id as string;

    const res = await http()
      .patch(`/api/users/${staffId}`)
      .set(admin)
      .send({ isActive: false, branchIds: [TAGUIG] })
      .expect(200);
    expect(res.body).toMatchObject({
      isActive: false,
      branches: [{ code: 'TAGUIG' }],
    });

    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: staffLogin.body.refreshToken })
      .expect(401);
    const blocked = await http()
      .post('/api/auth/login')
      .send({ email: 'staff@mrb.test', password: 'staff-password' })
      .expect(403);
    expect(blocked.body.error.code).toBe('account_disabled');
  });

  it('protects the admin account', async () => {
    const disable = await http()
      .patch(`/api/users/${adminId}`)
      .set(admin)
      .send({ isActive: false })
      .expect(403);
    expect(disable.body.error.code).toBe('admin_protected');

    await http()
      .post(`/api/users/${adminId}/reset-password`)
      .set(admin)
      .expect(403);

    const rename = await http()
      .patch(`/api/users/${adminId}`)
      .set(admin)
      .send({ fullName: 'Dr. Owner' })
      .expect(200);
    expect(rename.body.fullName).toBe('Dr. Owner');
  });

  it('resets a password to a new temporary one', async () => {
    const staffId = db.users.find((u) => u.email === 'staff@mrb.test')!.id;
    const res = await http()
      .post(`/api/users/${staffId}/reset-password`)
      .set(admin)
      .expect(200);

    await http()
      .post('/api/auth/login')
      .send({ email: 'staff@mrb.test', password: 'staff-password' })
      .expect(401);
    const login = await http()
      .post('/api/auth/login')
      .send({ email: 'staff@mrb.test', password: res.body.temporaryPassword })
      .expect(200);
    expect(login.body.user.mustChangePassword).toBe(true);
  });

  it('branches: anyone logged in can list them, only the admin can edit', async () => {
    const staff = await bearer(app, 'staff@mrb.test', 'staff-password');
    const list = await http().get('/api/branches').set(staff).expect(200);
    expect(list.body.map((b: { code: string }) => b.code)).toEqual([
      'PASAY',
      'TAGUIG',
    ]);

    await http()
      .patch(`/api/branches/${PASAY}`)
      .set(staff)
      .send({ phone: '123' })
      .expect(403);
    const edited = await http()
      .patch(`/api/branches/${PASAY}`)
      .set(admin)
      .send({ phone: '0917 123 4567' })
      .expect(200);
    expect(edited.body.phone).toBe('0917 123 4567');

    await http().get('/api/branches').expect(401);
  });

  describe('phones on clinic accounts', () => {
    it('requires a valid phone and refuses one already in use', async () => {
      const missing = await http()
        .post('/api/users')
        .set(admin)
        .send({
          email: 'p1@mrb.test',
          fullName: 'P1',
          role: 'staff',
          branchIds: [PASAY],
        })
        .expect(422);
      expect(missing.body.error.fields.phone).toBeDefined();

      await http()
        .post('/api/users')
        .set(admin)
        .send({
          email: 'p1@mrb.test',
          phone: '0919 111 2222',
          fullName: 'P1',
          role: 'staff',
          branchIds: [PASAY],
        })
        .expect(201);
      const dup = await http()
        .post('/api/users')
        .set(admin)
        .send({
          email: 'p2@mrb.test',
          phone: '+639191112222',
          fullName: 'P2',
          role: 'staff',
          branchIds: [PASAY],
        })
        .expect(409);
      expect(dup.body.error.code).toBe('phone_taken');
    });

    it('the admin can add its own phone, and staff can be found by phone', async () => {
      const res = await http()
        .patch(`/api/users/${adminId}`)
        .set(admin)
        .send({ phone: '0917 555 0000' })
        .expect(200);
      expect(res.body.phone).toBe('+639175550000');

      const found = await http()
        .get('/api/users?search=0917555')
        .set(admin)
        .expect(200);
      expect(found.body.items.map((u: { id: string }) => u.id)).toEqual([
        adminId,
      ]);

      await http()
        .post('/api/auth/login')
        .send({ identifier: '09175550000', password: 'admin-password' })
        .expect(200);
    });
  });
});
