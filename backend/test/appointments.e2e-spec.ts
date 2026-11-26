import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  clinicDateOf,
  clinicInstant,
  dayOfWeek,
} from './../src/common/clinic-time.js';
import { hashPassword } from './../src/common/password.js';
import { createFakePrisma, FakePrisma } from './fake-prisma.js';
import { bearer, createTestApp } from './test-app.js';

const PASAY = '11111111-1111-4111-8111-111111111111';
const TAGUIG = '22222222-2222-4222-8222-222222222222';

/** A Monday about five weeks from now, so the tests never depend on today's date. */
function futureMonday(): string {
  let d = clinicDateOf(new Date(Date.now() + 35 * 24 * 3600 * 1000));
  while (dayOfWeek(d) !== 1) {
    d = clinicDateOf(
      new Date(clinicInstant(d, 12 * 60).getTime() + 24 * 3600 * 1000),
    );
  }
  return d;
}

describe('Schedules and appointments (e2e)', () => {
  let app: INestApplication;
  let db: FakePrisma;
  let admin: { Authorization: string };
  let staff: { Authorization: string };
  let taguigStaff: { Authorization: string };
  let patient: { Authorization: string };
  let doctorId: string;
  let doctor2Id: string;
  let patientFileId: string;
  const monday = futureMonday();
  const at = (clock: string) =>
    clinicInstant(
      monday,
      Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3)),
    ).toISOString();

  const http = () => request(app.getHttpServer());
  const addSchedule = (body: Record<string, unknown>) =>
    http()
      .post('/api/schedules')
      .set(admin)
      .send({
        branchId: PASAY,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        slotMinutes: 30,
        ...body,
      });

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
        email: 'tstaff@mrb.test',
        passwordHash: pw,
        role: 'staff',
        fullName: 'Tina',
      },
      [TAGUIG],
    );
    doctorId = db.addUser(
      {
        email: 'doc@mrb.test',
        passwordHash: pw,
        role: 'optometrist',
        fullName: 'Dr. Cruz',
      },
      [PASAY, TAGUIG],
    ).id;
    doctor2Id = db.addUser(
      {
        email: 'doc2@mrb.test',
        passwordHash: pw,
        role: 'optometrist',
        fullName: 'Dr. Lim',
      },
      [PASAY],
    ).id;
    app = await createTestApp(db);
    admin = await bearer(app, 'admin@mrb.test', 'password-1');
    staff = await bearer(app, 'staff@mrb.test', 'password-1');
    taguigStaff = await bearer(app, 'tstaff@mrb.test', 'password-1');

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
    patientFileId = db.patients[0].id;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('schedules', () => {
    it('creates and lists weekly hours', async () => {
      const res = await addSchedule({ optometristId: doctorId }).expect(201);
      expect(res.body).toMatchObject({
        optometrist: { fullName: 'Dr. Cruz' },
        branch: { code: 'PASAY' },
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '11:00',
        slotMinutes: 30,
        isActive: true,
      });
      const list = await http()
        .get(`/api/schedules?branchId=${PASAY}`)
        .set(staff)
        .expect(200);
      expect(list.body).toHaveLength(1);
    });

    it('refuses overlaps for the same optometrist, even across branches', async () => {
      await addSchedule({ optometristId: doctorId }).expect(201);
      const res = await addSchedule({
        optometristId: doctorId,
        branchId: TAGUIG,
        startTime: '10:30',
        endTime: '12:00',
      }).expect(409);
      expect(res.body.error.code).toBe('schedule_overlap');
      await addSchedule({
        optometristId: doctorId,
        branchId: TAGUIG,
        startTime: '11:00',
        endTime: '12:00',
      }).expect(201);
    });

    it('checks the optometrist and the hours', async () => {
      const notHere = await addSchedule({
        optometristId: doctor2Id,
        branchId: TAGUIG,
      }).expect(422);
      expect(notHere.body.error.fields.optometristId).toBeDefined();
      const short = await addSchedule({
        optometristId: doctorId,
        startTime: '09:00',
        endTime: '09:15',
      }).expect(422);
      expect(short.body.error.fields.endTime).toBeDefined();
      const bad = await addSchedule({
        optometristId: doctorId,
        startTime: '9am',
        slotMinutes: 25,
      }).expect(422);
      expect(Object.keys(bad.body.error.fields).sort()).toEqual([
        'slotMinutes',
        'startTime',
      ]);
    });

    it('branch guard: staff only see and change their own branches', async () => {
      const { body } = await addSchedule({ optometristId: doctorId }).expect(
        201,
      );
      await http()
        .get(`/api/schedules?branchId=${PASAY}`)
        .set(taguigStaff)
        .expect(403);
      const mine = await http()
        .get('/api/schedules')
        .set(taguigStaff)
        .expect(200);
      expect(mine.body).toHaveLength(0);
      await http()
        .patch(`/api/schedules/${body.id}`)
        .set(taguigStaff)
        .send({ endTime: '12:00' })
        .expect(403);
      await http().delete(`/api/schedules/${body.id}`).set(staff).expect(204);
    });
  });

  describe('slots and online booking', () => {
    beforeEach(async () => {
      await addSchedule({ optometristId: doctorId }).expect(201);
      await addSchedule({
        optometristId: doctor2Id,
        startTime: '10:00',
        endTime: '11:00',
      }).expect(201);
    });

    it('lists each optometrist slot for the day', async () => {
      const res = await http()
        .get(`/api/appointments/slots?branchId=${PASAY}&date=${monday}`)
        .set(patient)
        .expect(200);
      expect(
        res.body.slots.map(
          (s: { startsAt: string; optometrist: { fullName: string } }) => [
            s.startsAt,
            s.optometrist.fullName,
          ],
        ),
      ).toEqual([
        [at('09:00'), 'Dr. Cruz'],
        [at('09:30'), 'Dr. Cruz'],
        [at('10:00'), 'Dr. Cruz'],
        [at('10:00'), 'Dr. Lim'],
        [at('10:30'), 'Dr. Cruz'],
        [at('10:30'), 'Dr. Lim'],
      ]);
      expect(
        res.body.slots.every((s: { available: boolean }) => s.available),
      ).toBe(true);

      const tuesday = await http()
        .get(
          `/api/appointments/slots?branchId=${PASAY}&date=${clinicDateOf(new Date(Date.parse(at('12:00')) + 86400000))}`,
        )
        .set(patient)
        .expect(200);
      expect(tuesday.body.slots).toEqual([]);
    });

    it('a patient books an open slot; it becomes pending and the slot is taken', async () => {
      const res = await http()
        .post('/api/appointments')
        .set(patient)
        .send({
          branchId: PASAY,
          startsAt: at('09:30'),
          optometristId: doctorId,
          reason: 'Blurry vision',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'pending',
        source: 'online',
        startsAt: at('09:30'),
        endsAt: at('10:00'),
        optometrist: { fullName: 'Dr. Cruz' },
        patient: { code: 'P-000001', fullName: 'Pat' },
      });

      const slots = await http()
        .get(`/api/appointments/slots?branchId=${PASAY}&date=${monday}`)
        .set(patient);
      const nine30 = slots.body.slots.find(
        (s: { startsAt: string }) => s.startsAt === at('09:30'),
      );
      expect(nine30.available).toBe(false);
    });

    it('without an optometrist, takes any free one at that time', async () => {
      await db.appointment.create({
        data: {
          patientId: patientFileId,
          branchId: PASAY,
          optometristId: doctorId,
          startsAt: new Date(at('10:00')),
          endsAt: new Date(at('10:30')),
          status: 'confirmed',
          source: 'staff',
        },
      });
      // Someone else's file, so the patient isn't double-booked.
      const other = await http()
        .post('/api/patients')
        .set(staff)
        .send({ fullName: 'Other' });
      await db.appointment.update({
        where: { id: db.appointments[0].id },
        data: { patientId: other.body.id },
      });

      const res = await http()
        .post('/api/appointments')
        .set(patient)
        .send({ branchId: PASAY, startsAt: at('10:00') })
        .expect(201);
      expect(res.body.optometrist.fullName).toBe('Dr. Lim');
    });

    it('refuses taken, off-schedule and past times', async () => {
      await http()
        .post('/api/appointments')
        .set(patient)
        .send({
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(201);

      const second = await http()
        .post('/api/patients')
        .set(staff)
        .send({ fullName: 'Second', phone: '09170000002' });
      await http()
        .post(`/api/patients/${second.body.id}/portal-access`)
        .set(staff)
        .send({})
        .expect(201);
      const p2Login = await http()
        .post('/api/auth/login')
        .send({
          identifier: '09170000002',
          password: (
            await http()
              .post(`/api/patients/${second.body.id}/reset-password`)
              .set(staff)
          ).body.temporaryPassword,
        });
      const p2 = {
        Authorization: `Bearer ${p2Login.body.accessToken as string}`,
      };

      const taken = await http()
        .post('/api/appointments')
        .set(p2)
        .send({
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(409);
      expect(taken.body.error.code).toBe('slot_taken');

      const off = await http()
        .post('/api/appointments')
        .set(p2)
        .send({ branchId: PASAY, startsAt: at('09:10') })
        .expect(422);
      expect(off.body.error.fields.startsAt).toBeDefined();

      await http()
        .post('/api/appointments')
        .set(p2)
        .send({ branchId: PASAY, startsAt: '2020-01-06T09:00:00+08:00' })
        .expect(422);
    });

    it('a patient cannot be in two places at once', async () => {
      await http()
        .post('/api/appointments')
        .set(patient)
        .send({
          branchId: PASAY,
          startsAt: at('10:00'),
          optometristId: doctorId,
        })
        .expect(201);
      const res = await http()
        .post('/api/appointments')
        .set(patient)
        .send({
          branchId: PASAY,
          startsAt: at('10:00'),
          optometristId: doctor2Id,
        })
        .expect(409);
      expect(res.body.error.code).toBe('patient_busy');
    });

    it('online booking can be closed per branch', async () => {
      await http()
        .patch(`/api/branches/${PASAY}`)
        .set(admin)
        .send({ onlineBookingEnabled: false })
        .expect(200);
      const slots = await http()
        .get(`/api/appointments/slots?branchId=${PASAY}&date=${monday}`)
        .set(patient)
        .expect(403);
      expect(slots.body.error.code).toBe('booking_disabled');
      await http()
        .post('/api/appointments')
        .set(patient)
        .send({ branchId: PASAY, startsAt: at('09:00') })
        .expect(403);
      // Staff can still see and book.
      await http()
        .get(`/api/appointments/slots?branchId=${PASAY}&date=${monday}`)
        .set(staff)
        .expect(200);
    });

    it('patients see only their own appointments, without staff notes', async () => {
      const staffMade = await http()
        .post('/api/appointments')
        .set(staff)
        .send({
          patientId: patientFileId,
          branchId: PASAY,
          startsAt: at('10:30'),
          optometristId: doctorId,
          notes: 'internal',
        })
        .expect(201);
      expect(staffMade.body).toMatchObject({
        status: 'confirmed',
        source: 'staff',
        notes: 'internal',
      });

      const mine = await http()
        .get('/api/me/appointments')
        .set(patient)
        .expect(200);
      expect(mine.body.upcoming).toHaveLength(1);
      expect(mine.body.upcoming[0].notes).toBeNull();
      await http().get('/api/appointments').set(patient).expect(403);

      const other = await http()
        .post('/api/patients')
        .set(staff)
        .send({ fullName: 'Other' });
      const theirs = await http()
        .post('/api/appointments')
        .set(staff)
        .send({
          patientId: other.body.id,
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(201);
      await http()
        .get(`/api/appointments/${theirs.body.id}`)
        .set(patient)
        .expect(404);
    });
  });

  describe('staff booking and the visit flow', () => {
    beforeEach(async () => {
      await addSchedule({ optometristId: doctorId }).expect(201);
    });

    it('walk-in now → check in → complete', async () => {
      const walkIn = await http()
        .post('/api/appointments')
        .set(staff)
        .send({ patientId: patientFileId, branchId: PASAY, source: 'walk_in' })
        .expect(201);
      expect(walkIn.body).toMatchObject({
        status: 'confirmed',
        source: 'walk_in',
        optometrist: null,
      });

      await http()
        .post(`/api/appointments/${walkIn.body.id}/complete`)
        .set(staff)
        .expect(409);
      const checkedIn = await http()
        .post(`/api/appointments/${walkIn.body.id}/check-in`)
        .set(staff)
        .expect(200);
      expect(checkedIn.body.status).toBe('checked_in');
      const done = await http()
        .post(`/api/appointments/${walkIn.body.id}/complete`)
        .set(staff)
        .expect(200);
      expect(done.body.status).toBe('completed');
      await http()
        .post(`/api/appointments/${walkIn.body.id}/cancel`)
        .set(staff)
        .send({})
        .expect(409);
    });

    it('confirm, reschedule and cancel; check-in only on the day', async () => {
      const booked = await http()
        .post('/api/appointments')
        .set(patient)
        .send({
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(201);
      const id = booked.body.id as string;

      await http()
        .post(`/api/appointments/${id}/confirm`)
        .set(patient)
        .expect(403);
      expect(
        (
          await http()
            .post(`/api/appointments/${id}/confirm`)
            .set(staff)
            .expect(200)
        ).body.status,
      ).toBe('confirmed');
      const early = await http()
        .post(`/api/appointments/${id}/check-in`)
        .set(staff)
        .expect(409);
      expect(early.body.error.message).toMatch(/day of the appointment/);

      const moved = await http()
        .patch(`/api/appointments/${id}/reschedule`)
        .set(patient)
        .send({ startsAt: at('10:00') })
        .expect(200);
      expect(moved.body).toMatchObject({
        startsAt: at('10:00'),
        endsAt: at('10:30'),
        status: 'confirmed',
      });

      const cancelled = await http()
        .post(`/api/appointments/${id}/cancel`)
        .set(patient)
        .send({ reason: 'Fever' })
        .expect(200);
      expect(cancelled.body).toMatchObject({
        status: 'cancelled',
        cancelReason: 'Fever',
      });
      expect(db.auditLogs.map((a) => a.action)).toEqual(
        expect.arrayContaining([
          'appointment.reschedule',
          'appointment.cancel',
        ]),
      );

      // The slot is free again.
      const slots = await http()
        .get(`/api/appointments/slots?branchId=${PASAY}&date=${monday}`)
        .set(patient);
      expect(
        slots.body.slots.find(
          (s: { startsAt: string }) => s.startsAt === at('10:00'),
        ).available,
      ).toBe(true);
    });

    it('no-show only after the start time', async () => {
      const future = await http()
        .post('/api/appointments')
        .set(staff)
        .send({
          patientId: patientFileId,
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(201);
      await http()
        .post(`/api/appointments/${future.body.id}/no-show`)
        .set(staff)
        .expect(409);

      const now = await http()
        .post('/api/appointments')
        .set(staff)
        .send({ patientId: patientFileId, branchId: PASAY, source: 'walk_in' })
        .expect(201);
      expect(
        (
          await http()
            .post(`/api/appointments/${now.body.id}/no-show`)
            .set(staff)
            .expect(200)
        ).body.status,
      ).toBe('no_show');
    });

    it('staff cannot double-book an optometrist', async () => {
      const other = await http()
        .post('/api/patients')
        .set(staff)
        .send({ fullName: 'Other' });
      await http()
        .post('/api/appointments')
        .set(staff)
        .send({
          patientId: patientFileId,
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(201);
      const res = await http()
        .post('/api/appointments')
        .set(staff)
        .send({
          patientId: other.body.id,
          branchId: PASAY,
          startsAt: at('09:15'),
          optometristId: doctorId,
        })
        .expect(409);
      expect(res.body.error.code).toBe('slot_taken');
    });

    it('branch guard on appointments', async () => {
      const booked = await http()
        .post('/api/appointments')
        .set(staff)
        .send({
          patientId: patientFileId,
          branchId: PASAY,
          startsAt: at('09:00'),
          optometristId: doctorId,
        })
        .expect(201);
      await http()
        .post('/api/appointments')
        .set(taguigStaff)
        .send({
          patientId: patientFileId,
          branchId: PASAY,
          startsAt: at('09:30'),
        })
        .expect(403);
      await http()
        .get(`/api/appointments/${booked.body.id}`)
        .set(taguigStaff)
        .expect(404);
      expect(
        (
          await http()
            .get(`/api/appointments?date=${monday}`)
            .set(taguigStaff)
            .expect(200)
        ).body.total,
      ).toBe(0);

      const list = await http()
        .get(`/api/appointments?branchId=${PASAY}&date=${monday}`)
        .set(staff)
        .expect(200);
      expect(list.body).toMatchObject({
        total: 1,
        items: [{ id: booked.body.id }],
      });
      expect(
        (
          await http()
            .get(`/api/appointments?date=${monday}`)
            .set(admin)
            .expect(200)
        ).body.total,
      ).toBe(1);
    });
  });
});
