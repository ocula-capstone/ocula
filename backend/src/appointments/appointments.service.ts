import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { BranchAccessService } from '../branches/branch-access.service.js';
import {
  clinicDateOf,
  clinicDayRange,
  clinicInstant,
  dayOfWeek,
  isValidDate,
  overlaps,
  timeToMinutes,
} from '../common/clinic-time.js';
import { Page, pageArgs } from '../common/pagination.js';
import { patientCode } from '../patients/patients.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { scheduleSelect, ScheduleRow } from '../schedules/schedules.service.js';
import {
  AppointmentStatusName,
  CancelAppointmentDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  SlotsQueryDto,
} from './appointments.dto.js';

/** Statuses that keep the time taken. Cancelled and no-show free it again. */
const HOLDS_SLOT: AppointmentStatusName[] = [
  'pending',
  'confirmed',
  'checked_in',
  'completed',
];
const WALK_IN_MINUTES = 30;
const PAST_GRACE_MS = 60 * 60 * 1000; // staff may record a visit that started up to an hour ago

export interface Slot {
  optometrist: { id: string; fullName: string };
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export interface AppointmentView {
  id: string;
  status: AppointmentStatusName;
  source: 'online' | 'walk_in' | 'staff';
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  branch: { id: string; code: string; name: string };
  optometrist: { id: string; fullName: string } | null;
  patient: { id: string; code: string; fullName: string; phone: string | null };
  createdAt: Date;
}

const appointmentSelect = {
  id: true,
  status: true,
  source: true,
  startsAt: true,
  endsAt: true,
  reason: true,
  notes: true,
  cancelReason: true,
  cancelledAt: true,
  createdAt: true,
  patientId: true,
  branchId: true,
  optometristId: true,
  branch: { select: { id: true, code: true, name: true } },
  optometrist: { select: { id: true, fullName: true } },
  patient: {
    select: {
      id: true,
      patientNo: true,
      fullName: true,
      phone: true,
      userId: true,
    },
  },
} as const;

interface AppointmentRow {
  id: string;
  status: AppointmentStatusName;
  source: AppointmentView['source'];
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  patientId: string;
  branchId: string;
  optometristId: string | null;
  branch: AppointmentView['branch'];
  optometrist: AppointmentView['optometrist'];
  patient: {
    id: string;
    patientNo: number;
    fullName: string;
    phone: string | null;
    userId: string | null;
  };
}

const toView = (a: AppointmentRow, forPatient = false): AppointmentView => ({
  id: a.id,
  status: a.status,
  source: a.source,
  startsAt: a.startsAt,
  endsAt: a.endsAt,
  reason: a.reason,
  notes: forPatient ? null : a.notes,
  cancelReason: a.cancelReason,
  cancelledAt: a.cancelledAt,
  branch: a.branch,
  optometrist: a.optometrist,
  patient: {
    id: a.patient.id,
    code: patientCode(a.patient.patientNo),
    fullName: a.patient.fullName,
    phone: a.patient.phone,
  },
  createdAt: a.createdAt,
});

const notFound = () =>
  new NotFoundException({
    error: { code: 'not_found', message: 'Appointment not found.' },
  });

const fieldError = (fields: Record<string, string>) =>
  new UnprocessableEntityException({
    error: {
      code: 'validation_failed',
      message: 'Please check the highlighted fields.',
      fields,
    },
  });

const invalidStatus = (message: string) =>
  new ConflictException({ error: { code: 'invalid_status', message } });

const slotTaken = () =>
  new ConflictException({
    error: {
      code: 'slot_taken',
      message: 'That time is no longer free. Please choose another.',
    },
  });

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BranchAccessService,
    private readonly audit: AuditService,
  ) {}

  // ── Free time slots ─────────────────────────────────────────

  async slots(query: SlotsQueryDto, user: AuthUser) {
    if (!isValidDate(query.date))
      throw fieldError({ date: 'Enter a real date.' });
    const branch = await this.findBranch(query.branchId);
    if (user.role === 'patient') {
      this.assertOnlineBooking(branch);
    } else {
      await this.access.assertAccess(user, branch.id);
    }
    const slots = await this.computeSlots(
      branch.id,
      query.date,
      query.optometristId,
    );
    return {
      date: query.date,
      branch: { id: branch.id, code: branch.code, name: branch.name },
      onlineBookingEnabled: branch.onlineBookingEnabled,
      slots: slots.map((s) => ({
        optometrist: s.optometrist,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        available: s.available,
      })),
    };
  }

  /** Every slot of every active schedule that day, each marked free or taken. */
  private async computeSlots(
    branchId: string,
    date: string,
    optometristId?: string,
    ignoreAppointmentId?: string,
  ) {
    const schedules = (await this.prisma.optometristSchedule.findMany({
      where: {
        branchId,
        dayOfWeek: dayOfWeek(date),
        isActive: true,
        ...(optometristId ? { optometristId } : {}),
        optometrist: { isActive: true },
      },
      select: scheduleSelect,
    })) as ScheduleRow[];
    if (schedules.length === 0) return [];

    const { start, end } = clinicDayRange(date);
    const busy: {
      id: string;
      optometristId: string | null;
      startsAt: Date;
      endsAt: Date;
    }[] = await this.prisma.appointment.findMany({
      where: {
        optometristId: {
          in: [...new Set(schedules.map((s) => s.optometristId))],
        },
        status: { in: HOLDS_SLOT },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { id: true, optometristId: true, startsAt: true, endsAt: true },
    });

    const now = new Date();
    const slots: {
      optometrist: { id: string; fullName: string };
      startsAt: Date;
      endsAt: Date;
      available: boolean;
    }[] = [];
    for (const s of schedules) {
      const from = timeToMinutes(s.startTime);
      const to = timeToMinutes(s.endTime);
      for (let m = from; m + s.slotMinutes <= to; m += s.slotMinutes) {
        const startsAt = clinicInstant(date, m);
        const endsAt = clinicInstant(date, m + s.slotMinutes);
        const taken = busy.some(
          (b) =>
            b.id !== ignoreAppointmentId &&
            b.optometristId === s.optometristId &&
            overlaps(startsAt, endsAt, b.startsAt, b.endsAt),
        );
        slots.push({
          optometrist: s.optometrist,
          startsAt,
          endsAt,
          available: !taken && startsAt > now,
        });
      }
    }
    return slots.sort(
      (a, b) =>
        a.startsAt.getTime() - b.startsAt.getTime() ||
        a.optometrist.fullName.localeCompare(b.optometrist.fullName),
    );
  }

  // ── Booking ─────────────────────────────────────────────────

  async create(
    dto: CreateAppointmentDto,
    user: AuthUser,
  ): Promise<AppointmentView> {
    return user.role === 'patient'
      ? this.bookOnline(dto, user)
      : this.bookByStaff(dto, user);
  }

  /** A patient books one of the open slots for themselves. Staff confirm it later. */
  private async bookOnline(
    dto: CreateAppointmentDto,
    user: AuthUser,
  ): Promise<AppointmentView> {
    const patient = await this.ownPatient(user);
    const branch = await this.findBranch(dto.branchId);
    this.assertOnlineBooking(branch);
    if (!dto.startsAt) throw fieldError({ startsAt: 'Choose a time.' });

    const slot = await this.pickSlot(
      branch.id,
      new Date(dto.startsAt),
      dto.optometristId,
    );
    await this.assertPatientFree(patient.id, slot.startsAt, slot.endsAt);
    const row = (await this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        branchId: branch.id,
        optometristId: slot.optometrist.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: 'pending',
        source: 'online',
        reason: dto.reason ?? null,
        createdById: user.id,
      },
      select: appointmentSelect,
    })) as AppointmentRow;
    return toView(row, true);
  }

  /** Staff book for a patient (by phone, or a walk-in). Already confirmed. */
  private async bookByStaff(
    dto: CreateAppointmentDto,
    user: AuthUser,
  ): Promise<AppointmentView> {
    if (!dto.patientId) throw fieldError({ patientId: 'Choose the patient.' });
    await this.access.assertAccess(user, dto.branchId);
    await this.findBranch(dto.branchId);
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient)
      throw fieldError({ patientId: 'This patient does not exist.' });

    const source = dto.source ?? 'staff';
    const times = await this.staffTimes(
      dto.branchId,
      dto.startsAt,
      dto.optometristId,
      source,
    );
    await this.assertPatientFree(patient.id, times.startsAt, times.endsAt);

    const row = (await this.prisma.appointment.create({
      data: {
        patientId: patient.id,
        branchId: dto.branchId,
        optometristId: times.optometristId,
        startsAt: times.startsAt,
        endsAt: times.endsAt,
        status: 'confirmed',
        source,
        reason: dto.reason ?? null,
        notes: dto.notes ?? null,
        createdById: user.id,
      },
      select: appointmentSelect,
    })) as AppointmentRow;
    return toView(row);
  }

  /**
   * Staff times: a walk-in without a time starts now. With an optometrist, the time must not
   * clash with their other visits; the length follows their schedule, else 30 minutes.
   */
  private async staffTimes(
    branchId: string,
    startsAtRaw: string | undefined,
    optometristId: string | undefined,
    source: 'staff' | 'walk_in',
    ignoreAppointmentId?: string,
  ): Promise<{ startsAt: Date; endsAt: Date; optometristId: string | null }> {
    let startsAt: Date;
    if (startsAtRaw) {
      startsAt = new Date(startsAtRaw);
    } else if (source === 'walk_in') {
      startsAt = new Date(Math.floor(Date.now() / 60_000) * 60_000);
    } else {
      throw fieldError({ startsAt: 'Choose a time.' });
    }
    if (startsAt.getTime() < Date.now() - PAST_GRACE_MS) {
      throw fieldError({ startsAt: 'Choose a time that has not passed.' });
    }

    let minutes = WALK_IN_MINUTES;
    if (optometristId) {
      await this.assertOptometristAtBranch(optometristId, branchId);
      const schedule = (
        (await this.prisma.optometristSchedule.findMany({
          where: {
            optometristId,
            branchId,
            dayOfWeek: dayOfWeek(clinicDateOf(startsAt)),
            isActive: true,
          },
          select: scheduleSelect,
        })) as ScheduleRow[]
      )[0];
      if (schedule) minutes = schedule.slotMinutes;
    }
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
    if (optometristId) {
      await this.assertOptometristFree(
        optometristId,
        startsAt,
        endsAt,
        ignoreAppointmentId,
      );
    }
    return { startsAt, endsAt, optometristId: optometristId ?? null };
  }

  /** The open slot starting at this instant (with this optometrist, or the first free one). */
  private async pickSlot(
    branchId: string,
    startsAt: Date,
    optometristId?: string,
    ignoreAppointmentId?: string,
  ) {
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw fieldError({ startsAt: 'Choose a time in the future.' });
    }
    const slots = await this.computeSlots(
      branchId,
      clinicDateOf(startsAt),
      optometristId,
      ignoreAppointmentId,
    );
    const atTime = slots.filter(
      (s) => s.startsAt.getTime() === startsAt.getTime(),
    );
    if (atTime.length === 0) {
      throw fieldError({ startsAt: 'Choose one of the open times.' });
    }
    const free = atTime.find((s) => s.available);
    if (!free) throw slotTaken();
    return free;
  }

  // ── Viewing ─────────────────────────────────────────────────

  async list(
    query: ListAppointmentsQueryDto,
    user: AuthUser,
  ): Promise<Page<AppointmentView>> {
    const branchId = await this.access.branchFilter(user, query.branchId);
    const range = this.dateRange(query);
    const where = {
      ...(branchId ? { branchId } : {}),
      ...(range ? { startsAt: range } : {}),
      ...(query.optometristId ? { optometristId: query.optometristId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        select: appointmentSelect,
        orderBy: { startsAt: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return {
      items: (rows as AppointmentRow[]).map((r) => toView(r)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string, user: AuthUser): Promise<AppointmentView> {
    const row = await this.findFor(id, user);
    return toView(row, user.role === 'patient');
  }

  /** The patient's own visits: upcoming (soonest first) and past (latest first). */
  async mine(
    user: AuthUser,
  ): Promise<{ upcoming: AppointmentView[]; past: AppointmentView[] }> {
    const patient = await this.ownPatient(user);
    const rows = (await this.prisma.appointment.findMany({
      where: { patientId: patient.id },
      select: appointmentSelect,
      orderBy: { startsAt: 'asc' },
    })) as AppointmentRow[];
    const now = new Date();
    const isUpcoming = (r: AppointmentRow) =>
      r.endsAt > now &&
      (r.status === 'pending' ||
        r.status === 'confirmed' ||
        r.status === 'checked_in');
    return {
      upcoming: rows.filter(isUpcoming).map((r) => toView(r, true)),
      past: rows
        .filter((r) => !isUpcoming(r))
        .reverse()
        .slice(0, 50)
        .map((r) => toView(r, true)),
    };
  }

  // ── Changes ─────────────────────────────────────────────────

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    user: AuthUser,
  ): Promise<AppointmentView> {
    const current = await this.findFor(id, user);
    if (current.status !== 'pending' && current.status !== 'confirmed') {
      throw invalidStatus(
        'Only pending or confirmed appointments can be moved.',
      );
    }
    const startsAt = new Date(dto.startsAt);
    let times: { startsAt: Date; endsAt: Date; optometristId: string | null };

    if (user.role === 'patient') {
      if (current.startsAt <= new Date())
        throw invalidStatus('This appointment has already started.');
      const branch = await this.findBranch(current.branchId);
      this.assertOnlineBooking(branch);
      const slot = await this.pickSlot(
        current.branchId,
        startsAt,
        dto.optometristId,
        id,
      );
      times = {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        optometristId: slot.optometrist.id,
      };
    } else {
      times = await this.staffTimes(
        current.branchId,
        dto.startsAt,
        dto.optometristId ?? current.optometristId ?? undefined,
        'staff',
        id,
      );
    }
    await this.assertPatientFree(
      current.patientId,
      times.startsAt,
      times.endsAt,
      id,
    );

    const row = (await this.prisma.appointment.update({
      where: { id },
      data: times,
      select: appointmentSelect,
    })) as AppointmentRow;
    await this.audit.log({
      userId: user.id,
      action: 'appointment.reschedule',
      entity: 'appointment',
      entityId: id,
      data: {
        from: current.startsAt.toISOString(),
        to: times.startsAt.toISOString(),
      },
    });
    return toView(row, user.role === 'patient');
  }

  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    user: AuthUser,
  ): Promise<AppointmentView> {
    const current = await this.findFor(id, user);
    if (current.status !== 'pending' && current.status !== 'confirmed') {
      throw invalidStatus(
        'Only pending or confirmed appointments can be cancelled.',
      );
    }
    if (user.role === 'patient' && current.startsAt <= new Date()) {
      throw invalidStatus(
        'This appointment has already started. Please call the clinic.',
      );
    }
    const row = await this.setStatus(current, 'cancelled', {
      cancelledAt: new Date(),
      cancelReason: dto.reason ?? null,
    });
    await this.audit.log({
      userId: user.id,
      action: 'appointment.cancel',
      entity: 'appointment',
      entityId: id,
      data: { by: user.role, reason: dto.reason ?? null },
    });
    return toView(row, user.role === 'patient');
  }

  async confirm(id: string, user: AuthUser): Promise<AppointmentView> {
    const current = await this.findFor(id, user);
    if (current.status !== 'pending')
      throw invalidStatus('Only pending appointments can be confirmed.');
    return toView(await this.setStatus(current, 'confirmed'));
  }

  async checkIn(id: string, user: AuthUser): Promise<AppointmentView> {
    const current = await this.findFor(id, user);
    if (current.status !== 'pending' && current.status !== 'confirmed') {
      throw invalidStatus(
        'Only pending or confirmed appointments can be checked in.',
      );
    }
    if (clinicDateOf(current.startsAt) !== clinicDateOf(new Date())) {
      throw invalidStatus(
        'Check-in is only possible on the day of the appointment.',
      );
    }
    return toView(await this.setStatus(current, 'checked_in'));
  }

  async complete(id: string, user: AuthUser): Promise<AppointmentView> {
    const current = await this.findFor(id, user);
    if (current.status !== 'checked_in') {
      throw invalidStatus('Check the patient in before completing the visit.');
    }
    return toView(await this.setStatus(current, 'completed'));
  }

  async noShow(id: string, user: AuthUser): Promise<AppointmentView> {
    const current = await this.findFor(id, user);
    if (current.status !== 'pending' && current.status !== 'confirmed') {
      throw invalidStatus(
        'Only pending or confirmed appointments can be marked as no-show.',
      );
    }
    if (current.startsAt > new Date())
      throw invalidStatus('This appointment has not started yet.');
    const row = await this.setStatus(current, 'no_show');
    await this.audit.log({
      userId: user.id,
      action: 'appointment.no_show',
      entity: 'appointment',
      entityId: id,
    });
    return toView(row);
  }

  // ── Helpers ─────────────────────────────────────────────────

  private async setStatus(
    current: AppointmentRow,
    status: AppointmentStatusName,
    extra: Record<string, unknown> = {},
  ): Promise<AppointmentRow> {
    return (await this.prisma.appointment.update({
      where: { id: current.id },
      data: { status, ...extra },
      select: appointmentSelect,
    })) as AppointmentRow;
  }

  /** Clinic users: only their branches. Patients: only their own. Anything else reads as not found. */
  private async findFor(id: string, user: AuthUser): Promise<AppointmentRow> {
    const row = (await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    })) as AppointmentRow | null;
    if (!row) throw notFound();
    if (user.role === 'patient') {
      if (row.patient.userId !== user.id) throw notFound();
    } else if (!(await this.access.canAccess(user, row.branchId))) {
      throw notFound();
    }
    return row;
  }

  private async ownPatient(user: AuthUser): Promise<{ id: string }> {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException({
        error: { code: 'forbidden', message: 'Only patients can do this.' },
      });
    }
    return patient;
  }

  private async findBranch(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, onlineBookingEnabled: true },
    });
    if (!branch) throw fieldError({ branchId: 'This branch does not exist.' });
    return branch;
  }

  private assertOnlineBooking(branch: {
    name: string;
    onlineBookingEnabled: boolean;
  }): void {
    if (!branch.onlineBookingEnabled) {
      throw new ForbiddenException({
        error: {
          code: 'booking_disabled',
          message: `Online booking is closed for ${branch.name}. Please call the clinic.`,
        },
      });
    }
  }

  private async assertOptometristAtBranch(
    optometristId: string,
    branchId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: optometristId },
      select: {
        role: true,
        isActive: true,
        branches: { select: { branchId: true } },
      },
    });
    if (
      !user ||
      user.role !== 'optometrist' ||
      !user.isActive ||
      !user.branches.some((b: { branchId: string }) => b.branchId === branchId)
    ) {
      throw fieldError({
        optometristId: 'Choose an active optometrist of this branch.',
      });
    }
  }

  private async assertOptometristFree(
    optometristId: string,
    startsAt: Date,
    endsAt: Date,
    exceptId?: string,
  ): Promise<void> {
    const clash = await this.prisma.appointment.findMany({
      where: {
        optometristId,
        status: { in: HOLDS_SLOT },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (clash.some((c: { id: string }) => c.id !== exceptId)) throw slotTaken();
  }

  private async assertPatientFree(
    patientId: string,
    startsAt: Date,
    endsAt: Date,
    exceptId?: string,
  ): Promise<void> {
    const clash = await this.prisma.appointment.findMany({
      where: {
        patientId,
        status: { in: HOLDS_SLOT },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    });
    if (clash.some((c: { id: string }) => c.id !== exceptId)) {
      throw new ConflictException({
        error: {
          code: 'patient_busy',
          message: 'This patient already has an appointment at that time.',
        },
      });
    }
  }

  private dateRange(
    query: ListAppointmentsQueryDto,
  ): { gte: Date; lt: Date } | undefined {
    const from = query.date ?? query.from;
    const to = query.date ?? query.to;
    for (const [field, value] of [
      ['date', query.date],
      ['from', query.from],
      ['to', query.to],
    ] as const) {
      if (value && !isValidDate(value))
        throw fieldError({ [field]: 'Enter a real date.' });
    }
    if (!from && !to) return undefined;
    return {
      gte: from ? clinicDayRange(from).start : new Date(0),
      lt: to ? clinicDayRange(to).end : new Date(8.64e15),
    };
  }
}
