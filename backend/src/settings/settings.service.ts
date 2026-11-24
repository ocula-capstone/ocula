import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingsDto } from './settings.dto.js';

export interface ClinicSettings {
  recallIntervalMonths: number;
  recallWindowDays: number;
  lowStockThreshold: number;
  forcePasswordChange: boolean;
  updatedAt: Date;
}

const select = {
  recallIntervalMonths: true,
  recallWindowDays: true,
  lowStockThreshold: true,
  forcePasswordChange: true,
  updatedAt: true,
} as const;

const ID = 'default';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The one settings row, created with the defaults the first time it's read. */
  get(): Promise<ClinicSettings> {
    return this.prisma.clinicSetting.upsert({
      where: { id: ID },
      create: { id: ID },
      update: {},
      select,
    });
  }

  async update(
    dto: UpdateSettingsDto,
    actorId: string,
  ): Promise<ClinicSettings> {
    const before = await this.get();
    const fields = definedFields(dto);
    const after = await this.prisma.clinicSetting.update({
      where: { id: ID },
      data: { ...fields, updatedById: actorId },
      select,
    });
    const changes = changedFields(
      before,
      after,
      Object.keys(fields) as (keyof UpdateSettingsDto)[],
    );
    if (Object.keys(changes).length) {
      await this.audit.log({
        userId: actorId,
        action: 'settings.update',
        entity: 'settings',
        entityId: ID,
        data: changes,
      });
    }
    return after;
  }
}

/** A plain object with only the fields the request actually sent. */
export function definedFields<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/** `{ field: { from, to } }` for the fields that really changed. */
export function changedFields<T extends object>(
  before: T,
  after: T,
  keys: (keyof T)[],
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    if (before[key] !== after[key])
      out[String(key)] = { from: before[key], to: after[key] };
  }
  return out;
}
