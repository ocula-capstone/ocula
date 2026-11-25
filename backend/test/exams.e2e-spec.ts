import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { clinicDateOf } from './../src/common/clinic-time.js';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';
const TAGUIG = '22222222-2222-4222-8222-222222222222';

type Auth = { Authorization: string };

describe('Eye exams and prescriptions (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let admin: Auth;
  let staff: Auth;
  let doctor: Auth;
  let doctor2: Auth;
  let patient: Auth;
  let noFilePatient: Auth;
  let patientId: string;

  const http = () => request(app.getHttpServer());
  const newExam = (body: Record<string, unknown> = {}, as: Auth = doctor) =>
    http()
      .post('/api/exams')
      .set(as)
      .send({ patientId, branchId: PASAY, ...body });
  const addAppointment = (
    status: string,
    overrides: Record<string, unknown> = {},
  ) => {
    const row = {
      id: randomUUID(),
      patientId,
      branchId: PASAY,
      optometristId: null,
      status,
      source: 'walk_in',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 60_000),
      ...overrides,
    };
    db.appointments.push(row);
    return row.id;
  };

  beforeEach(async () => {
    db = createFakePrisma();
    db.addBranch({ id: PASAY, code: 'PASAY', name: 'MRB Pasay' });
    db.addBranch({ id: TAGUIG, code: 'TAGUIG', name: 'MRB Taguig' });
    const pw = await hashPassword('password-1');
    db.addUser({
      email: 'admin@mrb.test',
      passwordHash: pw,
      role: 'admin',
      fullName: 'Admin',
    });
    db.addUser(
      {
        email: 'staff@mrb.test',
        passwordHash: pw,
        role: 'staff',
        fullName: 'Ana',
      },
      [PASAY],
    );
    db.addUser(
      {
        email: 'doc@mrb.test',
        passwordHash: pw,
        role: 'optometrist',
        fullName: 'Dr. Cruz',
      },
      [PASAY],
    );
    db.addUser(
      {
        email: 'doc2@mrb.test',
        passwordHash: pw,
        role: 'optometrist',
        fullName: 'Dr. Lim',
      },
      [PASAY, TAGUIG],
    );
    db.addUser({
      email: 'nofile@mrb.test',
      passwordHash: pw,
      role: 'patient',
      fullName: 'No File',
    });
    app = await createTestApp(db);
    admin = await bearer(app, 'admin@mrb.test', 'password-1');
    staff = await bearer(app, 'staff@mrb.test', 'password-1');
    doctor = await bearer(app, 'doc@mrb.test', 'password-1');
    doctor2 = await bearer(app, 'doc2@mrb.test', 'password-1');
    noFilePatient = await bearer(app, 'nofile@mrb.test', 'password-1');

    await http()
      .post('/api/auth/register')
      .send({
        fullName: 'Pat',
        phone: '09171230000',
        password: 'patient-pass',
        birthDate: '1990-01-01',
      })
      .expect(201);
    patient = await bearer(app, '09171230000', 'patient-pass');
    patientId = db.patients[0].id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('draft → edit → finalize with a prescription', async () => {
    const created = await newExam({
      chiefComplaint: 'Blurry far vision',
      odSphere: -1.25,
      osSphere: -1,
      pd: 62.5,
    }).expect(201);
    expect(created.body).toMatchObject({
      status: 'draft',
      source: 'manual',
      odSphere: -1.25,
      osSphere: -1,
      odCylinder: null,
      pd: 62.5,
      optometrist: { fullName: 'Dr. Cruz' },
      branch: { code: 'PASAY' },
      patient: { id: patientId, code: 'P-000001', fullName: 'Pat' },
      prescriptions: [],
    });
    const id = created.body.id as string;

    const edited = await http()
      .patch(`/api/exams/${id}`)
      .set(doctor)
      .send({
        odCylinder: -0.5,
        odAxis: 90,
        odVa: '20/20',
        diagnosis: 'Myopia',
      })
      .expect(200);
    expect(edited.body).toMatchObject({
      odCylinder: -0.5,
      odAxis: 90,
      odSphere: -1.25,
    });

    const final = await http()
      .post(`/api/exams/${id}/finalize`)
      .set(doctor)
      .send({ createPrescription: true, notes: 'Wear full time' })
      .expect(200);
    const today = clinicDateOf(new Date());
    const nextYear = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
    expect(final.body).toMatchObject({
      status: 'final',
      verifiedBy: { fullName: 'Dr. Cruz' },
    });
    expect(final.body.verifiedAt).toBeTruthy();
    expect(final.body.prescriptions).toHaveLength(1);
    expect(final.body.prescriptions[0]).toMatchObject({
      examId: id,
      type: 'spectacles',
      odSphere: -1.25,
      odCylinder: -0.5,
      odAxis: 90,
      osSphere: -1,
      pd: 62.5,
      expiresAt: nextYear,
      isExpired: false,
      issuedBy: { fullName: 'Dr. Cruz' },
    });

    const rxList = await http()
      .get(`/api/prescriptions?examId=${id}`)
      .set(staff)
      .expect(200);
    expect(rxList.body.total).toBe(1);
    await http()
      .get(`/api/prescriptions/${rxList.body.items[0].id as string}`)
      .set(staff)
      .expect(200);

    expect(db.auditLogs.map((a) => a.action)).toEqual(
      expect.arrayContaining([
        'exam.create',
        'exam.update',
        'exam.finalize',
        'prescription.create',
      ]),
    );

    // A correction is a new prescription; there is no edit or delete.
    await http()
      .post('/api/prescriptions')
      .set(doctor2)
      .send({ examId: id, type: 'contact_lens', expiresAt: '2027-06-30' })
      .expect(201);
    const mine = await http()
      .get('/api/me/prescriptions')
      .set(patient)
      .expect(200);
    expect(mine.body).toHaveLength(2);
    expect(mine.body[0]).toMatchObject({
      type: 'contact_lens',
      expiresAt: '2027-06-30',
    });
    // Notes are instructions for the patient, so they are shown.
    expect(mine.body[0].notes).toBeNull();
    expect(mine.body[1].notes).toBe('Wear full time');
    expect(mine.body[1].issuedBy).toBe('Dr. Cruz');
    expect(mine.body[1]).not.toHaveProperty('patient');
    await http()
      .delete(`/api/prescriptions/${mine.body[0].id as string}`)
      .set(doctor)
      .expect(404);
  });

  it('finalizes without a prescription and deletes drafts', async () => {
    const a = await newExam({ odSphere: 0, osSphere: 0.25 }).expect(201);
    const final = await http()
      .post(`/api/exams/${a.body.id as string}/finalize`)
      .set(doctor)
      .send({})
      .expect(200);
    expect(final.body.prescriptions).toEqual([]);

    const b = await newExam().expect(201);
    await http()
      .delete(`/api/exams/${b.body.id as string}`)
      .set(doctor)
      .expect(204);
    await http()
      .get(`/api/exams/${b.body.id as string}`)
      .set(doctor)
      .expect(404);
    expect(db.auditLogs.some((x) => x.action === 'exam.delete')).toBe(true);
  });

  describe('error codes', () => {
    it('not_your_exam and exam_final', async () => {
      const draft = await newExam({ odSphere: -1, osSphere: -1 }).expect(201);
      const id = draft.body.id as string;
      for (const call of [
        http().patch(`/api/exams/${id}`).set(doctor2).send({ diagnosis: 'x' }),
        http().delete(`/api/exams/${id}`).set(doctor2),
        http().post(`/api/exams/${id}/finalize`).set(doctor2).send({}),
      ]) {
        const res = await call.expect(403);
        expect(res.body.error.code).toBe('not_your_exam');
      }

      await http()
        .post(`/api/exams/${id}/finalize`)
        .set(doctor)
        .send({})
        .expect(200);
      for (const call of [
        http().patch(`/api/exams/${id}`).set(doctor).send({ diagnosis: 'x' }),
        http().delete(`/api/exams/${id}`).set(doctor),
        http().post(`/api/exams/${id}/finalize`).set(doctor).send({}),
      ]) {
        const res = await call.expect(409);
        expect(res.body.error.code).toBe('exam_final');
      }
    });

    it('links an exam to a checked-in visit only once', async () => {
      const visit = addAppointment('checked_in');
      await newExam({ appointmentId: visit }).expect(201);
      const again = await newExam({ appointmentId: visit }).expect(409);
      expect(again.body.error.code).toBe('appointment_has_exam');

      await newExam({ appointmentId: addAppointment('completed') }).expect(201);

      const early = await newExam({
        appointmentId: addAppointment('confirmed'),
      }).expect(409);
      expect(early.body.error.code).toBe('invalid_status');

      const elsewhere = await newExam({
        appointmentId: addAppointment('checked_in', { branchId: TAGUIG }),
      }).expect(422);
      expect(elsewhere.body.error.fields).toHaveProperty('appointmentId');
    });

    it('exam_not_final for a prescription from a draft', async () => {
      const draft = await newExam({ odSphere: -1, osSphere: -1 }).expect(201);
      const res = await http()
        .post('/api/prescriptions')
        .set(doctor)
        .send({ examId: draft.body.id })
        .expect(409);
      expect(res.body.error.code).toBe('exam_not_final');
      // Someone else's draft stays hidden.
      await http()
        .post('/api/prescriptions')
        .set(doctor2)
        .send({ examId: draft.body.id })
        .expect(404);
    });

    it('finalize needs both spheres', async () => {
      const draft = await newExam({ odSphere: -1 }).expect(201);
      const res = await http()
        .post(`/api/exams/${draft.body.id as string}/finalize`)
        .set(doctor)
        .send({})
        .expect(422);
      expect(res.body.error.code).toBe('validation_failed');
      expect(Object.keys(res.body.error.fields)).toEqual(['osSphere']);
    });
  });

  describe('outside prescriptions', () => {
    it('records one the patient brought in', async () => {
      const res = await http()
        .post('/api/prescriptions')
        .set(doctor)
        .send({
          patientId,
          type: 'spectacles',
          odSphere: -2,
          osSphere: -2.25,
          osCylinder: -0.75,
          osAxis: 170,
          expiresAt: '2025-01-31',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        examId: null,
        osAxis: 170,
        isExpired: true,
        issuedBy: { fullName: 'Dr. Cruz' },
      });
    });

    it('needs a patient, a type and valid values', async () => {
      const res = await http()
        .post('/api/prescriptions')
        .set(doctor)
        .send({ odCylinder: -1 })
        .expect(422);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(
        ['odAxis', 'odSphere', 'osSphere', 'patientId', 'type'].sort(),
      );
    });
  });

  describe('roles', () => {
    it('only optometrists write exams and prescriptions', async () => {
      await newExam({}, staff).expect(403);
      await newExam({}, admin).expect(403);
      await http()
        .post('/api/prescriptions')
        .set(staff)
        .send({ patientId, type: 'spectacles', odSphere: 0, osSphere: 0 })
        .expect(403);
    });

    it('patients cannot use the clinic routes', async () => {
      await http().get('/api/exams').set(patient).expect(403);
      await http()
        .post('/api/exams')
        .set(patient)
        .send({ patientId, branchId: PASAY })
        .expect(403);
      await http().get('/api/prescriptions').set(patient).expect(403);
    });
  });

  it('branch_forbidden when the optometrist is not assigned to the branch', async () => {
    const res = await newExam({ branchId: TAGUIG }).expect(403);
    expect(res.body.error.code).toBe('branch_forbidden');
  });

  it('drafts are visible only to their optometrist and the admin', async () => {
    const draft = await newExam({ odSphere: -1, osSphere: -1 }).expect(201);
    const id = draft.body.id as string;
    // A final exam from Taguig is visible to Pasay staff (exams are shared).
    const taguig = await newExam(
      { branchId: TAGUIG, odSphere: 1, osSphere: 1 },
      doctor2,
    ).expect(201);
    await http()
      .post(`/api/exams/${taguig.body.id as string}/finalize`)
      .set(doctor2)
      .send({})
      .expect(200);

    const total = async (as: Auth, q = '') =>
      (await http().get(`/api/exams${q}`).set(as).expect(200)).body
        .total as number;
    expect(await total(doctor)).toBe(2);
    expect(await total(admin)).toBe(2);
    expect(await total(staff)).toBe(1);
    expect(await total(doctor2)).toBe(1);
    expect(await total(doctor2, '?status=draft')).toBe(0);
    expect(await total(admin, `?status=draft&patientId=${patientId}`)).toBe(1);
    expect(await total(staff, `?branchId=${TAGUIG}`)).toBe(1);
    const today = clinicDateOf(new Date());
    expect(await total(admin, `?from=${today}&to=${today}`)).toBe(2);
    expect(await total(admin, '?from=2020-01-01&to=2020-01-31')).toBe(0);

    await http().get(`/api/exams/${id}`).set(staff).expect(404);
    await http().get(`/api/exams/${id}`).set(doctor2).expect(404);
    await http().get(`/api/exams/${id}`).set(admin).expect(200);
    await http()
      .get(`/api/exams/${taguig.body.id as string}`)
      .set(staff)
      .expect(200);
  });

  describe('validation', () => {
    it('rejects a 0.10 sphere step, a cylinder without axis and pd 80', async () => {
      const step = await newExam({ odSphere: 0.1 }).expect(422);
      expect(step.body.error.fields.odSphere).toBe(
        'Use -30.00 to +30.00 in 0.25 steps.',
      );

      const axis = await newExam({ odSphere: -1, odCylinder: -0.75 }).expect(
        422,
      );
      expect(axis.body.error.fields).toHaveProperty('odAxis');

      const pd = await newExam({ pd: 80 }).expect(422);
      expect(pd.body.error.fields).toHaveProperty('pd');
    });

    it('checks other ranges and the merged values on edit', async () => {
      const res = await newExam({
        osCylinder: 0.5,
        osAxis: 181,
        odAdd: 0.5,
        odVa: 'x'.repeat(21),
      }).expect(422);
      expect(Object.keys(res.body.error.fields).sort()).toEqual(
        ['odAdd', 'odVa', 'osAxis', 'osCylinder'].sort(),
      );
      const axisOnly = await newExam({ osAxis: 90 }).expect(422);
      expect(axisOnly.body.error.fields).toHaveProperty('osAxis');

      const draft = await newExam({ odCylinder: -1, odAxis: 45 }).expect(201);
      const cleared = await http()
        .patch(`/api/exams/${draft.body.id as string}`)
        .set(doctor)
        .send({ odAxis: null })
        .expect(422);
      expect(cleared.body.error.fields).toHaveProperty('odAxis');
    });
  });

  describe('patient view', () => {
    it('/me/exams shows final exams only, without OCR or internal fields', async () => {
      const a = await newExam({
        odSphere: -1,
        osSphere: -1,
        diagnosis: 'Myopia',
      }).expect(201);
      await newExam({ odSphere: -3, osSphere: -3 }).expect(201); // stays a draft
      db.eyeExams.find((e) => e.id === a.body.id)!.ocrRaw = { text: 'scan' };
      db.eyeExams.find((e) => e.id === a.body.id)!.ocrImagePath =
        'exams/scan.jpg';
      await http()
        .post(`/api/exams/${a.body.id as string}/finalize`)
        .set(doctor)
        .send({})
        .expect(200);

      const res = await http().get('/api/me/exams').set(patient).expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: a.body.id,
        odSphere: -1,
        diagnosis: 'Myopia',
        optometrist: 'Dr. Cruz',
        branch: { code: 'PASAY', name: 'MRB Pasay' },
      });
      for (const hidden of [
        'ocrRaw',
        'ocrImagePath',
        'status',
        'source',
        'verifiedBy',
        'appointmentId',
        'patient',
      ]) {
        expect(res.body[0]).not.toHaveProperty(hidden);
      }

      // Clinic users do see the OCR data.
      const clinic = await http()
        .get(`/api/exams/${a.body.id as string}`)
        .set(staff)
        .expect(200);
      expect(clinic.body).toMatchObject({
        ocrImagePath: 'exams/scan.jpg',
        ocrRaw: { text: 'scan' },
      });
    });

    it('a patient without a file gets empty lists', async () => {
      expect(
        (await http().get('/api/me/exams').set(noFilePatient).expect(200)).body,
      ).toEqual([]);
      expect(
        (
          await http()
            .get('/api/me/prescriptions')
            .set(noFilePatient)
            .expect(200)
        ).body,
      ).toEqual([]);
      await http().get('/api/me/exams').set(staff).expect(403);
    });
  });
});
