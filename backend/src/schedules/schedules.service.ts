import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { BranchAccessService } from '../branches/branch-access.service.js';
import {
  clockToMinutes,
  minutesToClock,
  minutesToTime,
  timeToMinutes,
} from '../common/clinic-time.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateScheduleDto,
  ListSchedulesQueryDto,
  UpdateScheduleDto,
} from './schedules.dto.js';

export interface ScheduleView {
  id: string;
  optometrist: { id: string; fullName: string };
  branch: { id: string; code: string; name: string };
  dayOfWeek: number;
  startTime: string; // "09:00", Manila time
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
}

export const scheduleSelect = {
  id: true,
  optometristId: true,
  branchId: true,
  dayOfWeek: true,
  startTime: true,
  endTime: true,
  slotMinutes: true,
  isActive: true,
  optometrist: { select: { id: true, fullName: true } },
  branch: { select: { id: true, code: true, name: true } },
} as const;

export interface ScheduleRow {
  id: string;
  optometristId: string;
  branchId: string;
  dayOfWeek: number;
  startTime: Date;
  endTime: Date;
  slotMinutes: number;
  isActive: boolean;
  optometrist: { id: string; fullName: string };
  branch: { id: string; code: string; name: string };
}

export const toScheduleView = (s: ScheduleRow): ScheduleView => ({
  id: s.id,
  optometrist: s.optometrist,
  branch: s.branch,
  dayOfWeek: s.dayOfWeek,
  startTime: minutesToClock(timeToMinutes(s.startTime)),
  endTime: minutesToClock(timeToMinutes(s.endTime)),
  slotMinutes: s.slotMinutes,
  isActive: s.isActive,
});

const notFound = () =>
  new NotFoundException({
    error: { code: 'not_found', message: 'Schedule not found.' },
  });

const fieldError = (fields: Record<string, string>) =>
  new UnprocessableEntityException({
    error: {
      code: 'validation_failed',
      message: 'Please check the highlighted fields.',
      fields,
    },
  });

/** Weekly working hours of optometrists, per branch. */
@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BranchAccessService,
  ) {}

  async list(
    query: ListSchedulesQueryDto,
    user: AuthUser,
  ): Promise<ScheduleView[]> {
    const branchId = await this.access.branchFilter(user, query.branchId);
    const rows = (await this.prisma.optometristSchedule.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(query.optometristId ? { optometristId: query.optometristId } : {}),
        ...(query.dayOfWeek !== undefined
          ? { dayOfWeek: query.dayOfWeek }
          : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      select: scheduleSelect,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })) as ScheduleRow[];
    return rows.map(toScheduleView);
  }

  async create(dto: CreateScheduleDto, user: AuthUser): Promise<ScheduleView> {
    await this.access.assertAccess(user, dto.branchId);
    const start = clockToMinutes(dto.startTime);
    const end = clockToMinutes(dto.endTime);
    const slotMinutes = dto.slotMinutes ?? 30;
    this.assertHours(start, end, slotMinutes);
    await this.assertOptometristAtBranch(dto.optometristId, dto.branchId);
    await this.assertNoOverlap(dto.optometristId, dto.dayOfWeek, start, end);

    const row = (await this.prisma.optometristSchedule.create({
      data: {
        optometristId: dto.optometristId,
        branchId: dto.branchId,
        dayOfWeek: dto.dayOfWeek,
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
        slotMinutes,
      },
      select: scheduleSelect,
    })) as ScheduleRow;
    return toScheduleView(row);
  }

  async update(
    id: string,
    dto: UpdateScheduleDto,
    user: AuthUser,
  ): Promise<ScheduleView> {
    const current = await this.find(id);
    await this.access.assertAccess(user, current.branchId);

    const dayOfWeek = dto.dayOfWeek ?? current.dayOfWeek;
    const start = dto.startTime
      ? clockToMinutes(dto.startTime)
      : timeToMinutes(current.startTime);
    const end = dto.endTime
      ? clockToMinutes(dto.endTime)
      : timeToMinutes(current.endTime);
    const slotMinutes = dto.slotMinutes ?? current.slotMinutes;
    const isActive = dto.isActive ?? current.isActive;
    this.assertHours(start, end, slotMinutes);
    if (isActive)
      await this.assertNoOverlap(
        current.optometristId,
        dayOfWeek,
        start,
        end,
        id,
      );

    const row = (await this.prisma.optometristSchedule.update({
      where: { id },
      data: {
        dayOfWeek,
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
        slotMinutes,
        isActive,
      },
      select: scheduleSelect,
    })) as ScheduleRow;
    return toScheduleView(row);
  }

  /** Booked appointments are kept; only future free slots disappear. */
  async remove(id: string, user: AuthUser): Promise<void> {
    const current = await this.find(id);
    await this.access.assertAccess(user, current.branchId);
    await this.prisma.optometristSchedule.delete({ where: { id } });
  }

  private async find(id: string): Promise<ScheduleRow> {
    const row = (await this.prisma.optometristSchedule.findUnique({
      where: { id },
      select: scheduleSelect,
    })) as ScheduleRow | null;
    if (!row) throw notFound();
    return row;
  }

  private assertHours(start: number, end: number, slotMinutes: number): void {
    if (end - start < slotMinutes) {
      throw fieldError({
        endTime: 'End time must be at least one slot after the start time.',
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
    if (!user || user.role !== 'optometrist' || !user.isActive) {
      throw fieldError({ optometristId: 'Choose an active optometrist.' });
    }
    if (
      !user.branches.some((b: { branchId: string }) => b.branchId === branchId)
    ) {
      throw fieldError({
        optometristId: 'This optometrist is not assigned to this branch.',
      });
    }
  }

  /** One optometrist can't work two blocks at the same time, in any branch. */
  private async assertNoOverlap(
    optometristId: string,
    dayOfWeek: number,
    start: number,
    end: number,
    exceptId?: string,
  ): Promise<void> {
    const sameDay = (await this.prisma.optometristSchedule.findMany({
      where: { optometristId, dayOfWeek, isActive: true },
      select: scheduleSelect,
    })) as ScheduleRow[];
    const clash = sameDay.find(
      (s) =>
        s.id !== exceptId &&
        start < timeToMinutes(s.endTime) &&
        timeToMinutes(s.startTime) < end,
    );
    if (clash) {
      const v = toScheduleView(clash);
      throw new ConflictException({
        error: {
          code: 'schedule_overlap',
          message: `This overlaps ${v.startTime}–${v.endTime} at ${v.branch.name}.`,
        },
      });
    }
  }
}
