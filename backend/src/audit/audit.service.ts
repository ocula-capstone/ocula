import { Injectable, Logger } from '@nestjs/common';
import { Page, pageArgs } from '../common/pagination.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ListAuditLogsQueryDto } from './audit.dto.js';

export interface AuditEntry {
  /** Who did it. Null for the system (e.g. the nightly job). */
  userId: string | null;
  /** What happened, as `entity.verb`, e.g. "user.disable", "settings.update". */
  action: string;
  entity: string;
  entityId?: string | null;
  /** Extra details. Never put passwords, tokens or other secrets here. */
  data?: Record<string, unknown>;
}

export interface AuditLogView {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  data: unknown;
  createdAt: Date;
  user: { id: string; fullName: string; email: string; role: string } | null;
}

/** "Who changed what" history for sensitive actions. Writing it never blocks the action itself. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          ...(entry.data ? { data: entry.data as Prisma.InputJsonValue } : {}),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not write audit entry ${entry.action}: ${(error as Error).message}`,
      );
    }
  }

  async list(query: ListAuditLogsQueryDto): Promise<Page<AuditLogView>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: { startsWith: query.action } } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          data: true,
          createdAt: true,
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        ...pageArgs(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items: rows as AuditLogView[],
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
