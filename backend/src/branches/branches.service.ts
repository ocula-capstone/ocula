import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { changedFields, definedFields } from '../settings/settings.service.js';
import { UpdateBranchDto } from './branches.dto.js';

const branchSelect = {
  id: true,
  code: true,
  name: true,
  address: true,
  phone: true,
  onlineBookingEnabled: true,
} as const;

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.branch.findMany({
      select: branchSelect,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateBranchDto, actorId: string) {
    const before = await this.prisma.branch.findUnique({
      where: { id },
      select: branchSelect,
    });
    if (!before) {
      throw new NotFoundException({
        error: { code: 'not_found', message: 'Branch not found.' },
      });
    }
    const fields = definedFields(dto);
    const after = await this.prisma.branch.update({
      where: { id },
      data: fields,
      select: branchSelect,
    });
    const changes = changedFields(
      before,
      after,
      Object.keys(fields) as (keyof typeof before)[],
    );
    if (Object.keys(changes).length) {
      await this.audit.log({
        userId: actorId,
        action:
          'onlineBookingEnabled' in changes
            ? 'branch.booking_toggle'
            : 'branch.update',
        entity: 'branch',
        entityId: id,
        data: changes,
      });
    }
    return after;
  }
}
