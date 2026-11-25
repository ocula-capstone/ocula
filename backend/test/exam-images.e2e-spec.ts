import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { createFakeStorage, FakeStorage } from './fake-storage.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';

type Auth = { Authorization: string };

describe('Exam photos via Supabase Storage (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let storage: FakeStorage;
  let staff: Auth;
  let doctor: Auth;
  let doctor2: Auth;
  let patient: Auth;
  let examId: string;

  const http = () => request(app.getHttpServer());
  const uploadUrl = (
    id = examId,
    as: Auth = doctor,
    contentType = 'image/jpeg',
  ) =>
    http()
      .post(`/api/exams/${id}/image/upload-url`)
      .set(as)
      .send({ contentType });
  /** Steps 1 and the app's own upload; returns the path to confirm. */
  const uploaded = async (size?: number, mimetype?: string) => {
    const res = await uploadUrl().expect(200);
    storage.upload(res.body.path as string, size, mimetype);
    return res.body.path as string;
  };
  const attach = (path: string, as: Auth = doctor) =>
    http().put(`/api/exams/${examId}/image`).set(as).send({ path });

  async function start(configured = true) {
    db = createFakePrisma();
    storage = createFakeStorage(configured);
    db.addBranch({ id: PASAY, code: 'PASAY', name: 'MRB Pasay' });
    const pw = await hashPassword('password-1');
    db.addUser({ email: 'staff@mrb.test', passwordHash: pw, role: 'staff' }, [
      PASAY,
    ]);
    db.addUser(
      { email: 'doc@mrb.test', passwordHash: pw, role: 'optometrist' },
      [PASAY],
    );
    db.addUser(
      { email: 'doc2@mrb.test', passwordHash: pw, role: 'optometrist' },
      [PASAY],
    );
    app = await createTestApp(db, [], storage);
    staff = await bearer(app, 'staff@mrb.test', 'password-1');
    doctor = await bearer(app, 'doc@mrb.test', 'password-1');
    doctor2 = await bearer(app, 'doc2@mrb.test', 'password-1');
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
    const exam = await http()
      .post('/api/exams')
      .set(doctor)
      .send({
        patientId: db.patients[0].id,
        branchId: PASAY,
        odSphere: -1,
        osSphere: -1,
      })
      .expect(201);
    examId = exam.body.id as string;
  }

  afterEach(async () => {
    await app.close();
  });

  describe('with storage set up', () => {
    beforeEach(() => start());

    it('upload URL → upload → attach → view, then replace and remove', async () => {
      const step1 = await uploadUrl().expect(200);
      expect(step1.body).toMatchObject({
        contentType: 'image/jpeg',
        maxBytes: 10 * 1024 * 1024,
        expiresIn: 7200,
      });
      expect(step1.body.path).toMatch(
        new RegExp(`^exams/${examId}/[0-9a-f-]{36}\\.jpg$`),
      );
      expect(step1.body.uploadUrl).toContain(step1.body.path);
      storage.upload(step1.body.path as string);

      const attached = await attach(step1.body.path as string).expect(200);
      expect(attached.body.ocrImagePath).toBe(step1.body.path);

      const view = await http()
        .get(`/api/exams/${examId}/image`)
        .set(doctor)
        .expect(200);
      expect(view.body).toEqual({
        url: `https://storage.test/view/${step1.body.path as string}?expires=300`,
        expiresIn: 300,
      });

      // A new photo replaces the old one, which is deleted from Storage.
      const second = await uploaded(4096, 'image/png');
      await attach(second).expect(200);
      expect(storage.objects.has(step1.body.path as string)).toBe(false);
      expect(storage.objects.has(second)).toBe(true);

      await http().delete(`/api/exams/${examId}/image`).set(doctor).expect(204);
      expect(storage.objects.size).toBe(0);
      const none = await http()
        .get(`/api/exams/${examId}/image`)
        .set(doctor)
        .expect(404);
      expect(none.body.error.code).toBe('no_image');
      const again = await http()
        .delete(`/api/exams/${examId}/image`)
        .set(doctor)
        .expect(404);
      expect(again.body.error.code).toBe('no_image');

      expect(db.auditLogs.map((a) => a.action)).toEqual(
        expect.arrayContaining(['exam.image_set', 'exam.image_remove']),
      );
    });

    it('keeps the photo on a final exam, readable by any clinic user', async () => {
      await attach(await uploaded()).expect(200);
      await http()
        .post(`/api/exams/${examId}/finalize`)
        .set(doctor)
        .send({})
        .expect(200);
      await http().get(`/api/exams/${examId}/image`).set(staff).expect(200);

      for (const call of [
        uploadUrl(),
        attach(`exams/${examId}/00000000-0000-4000-8000-000000000000.jpg`),
        http().delete(`/api/exams/${examId}/image`).set(doctor),
      ]) {
        const res = await call.expect(409);
        expect(res.body.error.code).toBe('exam_final');
      }
    });

    it('deleting a draft also deletes its photo', async () => {
      await attach(await uploaded()).expect(200);
      await http().delete(`/api/exams/${examId}`).set(doctor).expect(204);
      expect(storage.objects.size).toBe(0);
    });

    it('checks the path, that the file exists, its size and type', async () => {
      const missing = await uploadUrl().expect(200);
      const notThere = await attach(missing.body.path as string).expect(422);
      expect(notThere.body.error.fields.path).toBe(
        'The photo has not been uploaded yet.',
      );

      for (const bad of [
        'exams/other/x.jpg',
        `exams/${examId}/../../secret.jpg`,
        `exams/${examId}/00000000-0000-4000-8000-000000000000.exe`,
      ]) {
        const res = await attach(bad).expect(422);
        expect(res.body.error.fields).toHaveProperty('path');
      }

      const big = await uploaded(11 * 1024 * 1024);
      await attach(big).expect(422);
      expect(storage.objects.has(big)).toBe(false);

      const pdf = await uploaded(1000, 'application/pdf');
      await attach(pdf).expect(422);
      expect(storage.objects.has(pdf)).toBe(false);

      const type = await uploadUrl(examId, doctor, 'application/pdf').expect(
        422,
      );
      expect(type.body.error.fields.contentType).toBe(
        'Use a JPEG, PNG, WebP or HEIC photo.',
      );
    });

    it('only the exam optometrist changes the photo; drafts stay hidden', async () => {
      const notMine = await uploadUrl(examId, doctor2).expect(403);
      expect(notMine.body.error.code).toBe('not_your_exam');
      await uploadUrl(examId, staff).expect(403);

      await attach(await uploaded()).expect(200);
      await http().get(`/api/exams/${examId}/image`).set(doctor2).expect(404);
      await http().get(`/api/exams/${examId}/image`).set(staff).expect(404);
      await http().get(`/api/exams/${examId}/image`).set(patient).expect(403);

      const me = await http().get('/api/me/exams').set(patient).expect(200);
      expect(me.body).toEqual([]);
    });
  });

  it('answers 503 storage_unavailable while Storage is not set up', async () => {
    await start(false);
    const res = await uploadUrl().expect(503);
    expect(res.body.error.code).toBe('storage_unavailable');
    // The rest of the exam still works.
    await http()
      .post(`/api/exams/${examId}/finalize`)
      .set(doctor)
      .send({})
      .expect(200);
  });
});
