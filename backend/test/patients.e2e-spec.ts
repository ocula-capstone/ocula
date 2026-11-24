import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';

describe('Patients (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let staff: { Authorization: string };
  let doctor: { Authorization: string };

  const http = () => request(app.getHttpServer());
  const newFile = (body: Record<string, unknown>) =>
    http().post('/api/patients').set(staff).send(body);

  beforeEach(async () => {
    db = createFakePrisma();
    db.addBranch({ id: PASAY, code: 'PASAY', name: 'MRB Pasay' });
    db.addUser(
      {
        email: 'staff@mrb.test',
        passwordHash: await hashPassword('staff-password'),
        role: 'staff',
      },
      [PASAY],
    );
    db.addUser(
      {
        email: 'doc@mrb.test',
        passwordHash: await hashPassword('doc-password'),
        role: 'optometrist',
      },
      [PASAY],
    );
    app = await createTestApp(db);
    staff = await bearer(app, 'staff@mrb.test', 'staff-password');
    doctor = await bearer(app, 'doc@mrb.test', 'doc-password');
  });

  afterEach(async () => {
    await app.close();
  });

  it('staff open a file at the counter, with no login', async () => {
    const res = await newFile({
      fullName: ' Rosa Dela Cruz ',
      phone: '0917 222 3333',
      birthDate: '1950-02-01',
      sex: 'female',
      companyName: 'Acme Corp',
      homeBranchId: PASAY,
      notes: 'Prefers morning visits',
    }).expect(201);

    expect(res.body).toMatchObject({
      code: 'P-000001',
      fullName: 'Rosa Dela Cruz',
      phone: '+639172223333',
      birthDate: '1950-02-01',
      sex: 'female',
      homeBranch: { code: 'PASAY' },
      account: null,
    });
    expect(db.auditLogs.some((a) => a.action === 'patient.create')).toBe(true);
  });

  it('validates the file', async () => {
    const res = await newFile({
      phone: '123',
      birthDate: '2999-01-01',
      sex: 'x',
    }).expect(422);
    expect(Object.keys(res.body.error.fields).sort()).toEqual([
      'fullName',
      'phone',
      'sex',
    ]);

    const future = await newFile({
      fullName: 'X',
      birthDate: '2999-01-01',
    }).expect(422);
    expect(future.body.error.fields.birthDate).toBeDefined();
  });

  it('a file can have no phone (e.g. a child), and patients cannot use these endpoints', async () => {
    await newFile({ fullName: 'Baby Ana' }).expect(201);
    await http()
      .post('/api/auth/register')
      .send({
        fullName: 'Pat',
        phone: '09179990000',
        password: 'patient-pass',
        birthDate: '1990-01-01',
      })
      .expect(201);
    const patient = await bearer(app, '09179990000', 'patient-pass');
    await http().get('/api/patients').set(patient).expect(403);
  });

  it('searches by name, phone, patient number and email, and filters', async () => {
    await newFile({
      fullName: 'Rosa Dela Cruz',
      phone: '09172223333',
      companyName: 'Acme',
    });
    await newFile({ fullName: 'Juan Santos', phone: '09185556666' });
    await http().post('/api/auth/register').send({
      fullName: 'Maria Reyes',
      phone: '09197778888',
      email: 'maria@example.com',
      password: 'patient-pass',
      birthDate: '1990-01-01',
    });

    const q = async (query: string) =>
      (await http().get(`/api/patients?${query}`).set(doctor).expect(200)).body;

    expect(
      (await q('search=rosa')).items.map(
        (p: { fullName: string }) => p.fullName,
      ),
    ).toEqual(['Rosa Dela Cruz']);
    expect((await q('search=0918 555')).items[0].fullName).toBe('Juan Santos');
    expect((await q('search=P-000002')).items[0].fullName).toBe('Juan Santos');
    expect(
      (await q('search=2')).items.map((p: { code: string }) => p.code),
    ).toContain('P-000002');
    expect((await q('search=maria@example')).items[0].fullName).toBe(
      'Maria Reyes',
    );
    expect((await q('hasAccount=true')).total).toBe(1);
    expect((await q('hasAccount=false')).total).toBe(2);
    expect((await q('companyName=acme')).total).toBe(1);
    const all = await q('page=1&pageSize=2');
    expect(all).toMatchObject({ total: 3, page: 1, pageSize: 2 });
    expect(all.items).toHaveLength(2);
  });

  it('edits the file, can clear a field, and logs what changed', async () => {
    const { body } = await newFile({
      fullName: 'Rosa',
      address: 'Pasay City',
      occupation: 'Teacher',
    });
    const res = await http()
      .patch(`/api/patients/${body.id}`)
      .set(doctor)
      .send({ occupation: 'Retired', address: '' })
      .expect(200);
    expect(res.body).toMatchObject({ occupation: 'Retired', address: null });

    const entry = db.auditLogs.find((a) => a.action === 'patient.update');
    expect(entry?.data).toEqual({
      occupation: { from: 'Teacher', to: 'Retired' },
      address: { from: 'Pasay City', to: null },
    });
  });

  describe('portal access', () => {
    it('creates a login from the file, with a one-time temporary password', async () => {
      const { body: file } = await newFile({
        fullName: 'Lolo Ben',
        phone: '09173334444',
      });
      const res = await http()
        .post(`/api/patients/${file.id}/portal-access`)
        .set(staff)
        .send({})
        .expect(201);

      expect(res.body.patient.account).toMatchObject({
        phone: '+639173334444',
        email: null,
        isActive: true,
      });
      expect(res.body.temporaryPassword).toMatch(/^\w{4}-\w{4}-\w{4}$/);

      const login = await http()
        .post('/api/auth/login')
        .send({
          identifier: '0917 333 4444',
          password: res.body.temporaryPassword,
        })
        .expect(200);
      expect(login.body.user).toMatchObject({
        role: 'patient',
        mustChangePassword: true,
        fullName: 'Lolo Ben',
      });

      const again = await http()
        .post(`/api/patients/${file.id}/portal-access`)
        .set(staff)
        .send({})
        .expect(409);
      expect(again.body.error.code).toBe('already_has_account');
    });

    it('needs a phone, and refuses one another account uses', async () => {
      const { body: file } = await newFile({ fullName: 'No Phone' });
      const none = await http()
        .post(`/api/patients/${file.id}/portal-access`)
        .set(staff)
        .send({})
        .expect(422);
      expect(none.body.error.fields.phone).toBeDefined();

      await http().post('/api/auth/register').send({
        fullName: 'Parent',
        phone: '09175550001',
        password: 'patient-pass',
        birthDate: '1980-01-01',
      });
      const taken = await http()
        .post(`/api/patients/${file.id}/portal-access`)
        .set(staff)
        .send({ phone: '09175550001' })
        .expect(409);
      expect(taken.body.error.code).toBe('phone_taken');

      const ok = await http()
        .post(`/api/patients/${file.id}/portal-access`)
        .set(staff)
        .send({ phone: '09175550002', email: 'nophone@example.com' })
        .expect(201);
      expect(ok.body.patient).toMatchObject({
        phone: '+639175550002',
        account: { email: 'nophone@example.com' },
      });
    });

    it('only staff and admin can give access; optometrists cannot', async () => {
      const { body: file } = await newFile({
        fullName: 'X',
        phone: '09170001111',
      });
      await http()
        .post(`/api/patients/${file.id}/portal-access`)
        .set(doctor)
        .send({})
        .expect(403);
    });
  });

  it('staff reset a patient password, logging the patient out', async () => {
    const reg = await http()
      .post('/api/auth/register')
      .send({
        fullName: 'Pat',
        phone: '09178880000',
        password: 'patient-pass',
        birthDate: '1990-01-01',
      })
      .expect(201);
    const patientId = db.patients.find(
      (p) => p.userId === reg.body.user.id,
    )!.id;

    const res = await http()
      .post(`/api/patients/${patientId}/reset-password`)
      .set(staff)
      .expect(200);
    await http()
      .post('/api/auth/refresh')
      .send({ refreshToken: reg.body.refreshToken })
      .expect(401);
    await http()
      .post('/api/auth/login')
      .send({ identifier: '09178880000', password: 'patient-pass' })
      .expect(401);
    const login = await http()
      .post('/api/auth/login')
      .send({ identifier: '09178880000', password: res.body.temporaryPassword })
      .expect(200);
    expect(login.body.user.mustChangePassword).toBe(true);

    const { body: noLogin } = await newFile({ fullName: 'File only' });
    const none = await http()
      .post(`/api/patients/${noLogin.id}/reset-password`)
      .set(staff)
      .expect(409);
    expect(none.body.error.code).toBe('no_account');
  });

  describe('my file (patient portal)', () => {
    it('shows the own file without staff notes, and lets the patient edit a few fields', async () => {
      await http().post('/api/auth/register').send({
        fullName: 'Pat',
        phone: '09176660000',
        password: 'patient-pass',
        birthDate: '1990-01-01',
      });
      const patientId = db.patients[0].id;
      await http()
        .patch(`/api/patients/${patientId}`)
        .set(staff)
        .send({ notes: 'internal only' })
        .expect(200);

      const me = await bearer(app, '09176660000', 'patient-pass');
      const mine = await http().get('/api/me/patient').set(me).expect(200);
      expect(mine.body).toMatchObject({
        fullName: 'Pat',
        birthDate: '1990-01-01',
        notes: null,
      });

      const edited = await http()
        .patch('/api/me/patient')
        .set(me)
        .send({ address: 'Taguig', fullName: 'Hacker', notes: 'x' })
        .expect(200);
      expect(edited.body).toMatchObject({
        address: 'Taguig',
        fullName: 'Pat',
        notes: null,
      });
    });

    it('is for patients only', async () => {
      await http().get('/api/me/patient').set(staff).expect(403);
    });
  });
});
