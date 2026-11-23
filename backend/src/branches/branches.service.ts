import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateBranchDto } from './branches.dto.js';

const branchSelect = {
  id: true,
  code: true,
  name: true,
  address: true,
  phone: true,
} as const;

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.branch.findMany({
      select: branchSelect,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    const exists = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException({
        error: { code: 'not_found', message: 'Branch not found.' },
      });
    }
    return this.prisma.branch.update({
      where: { id },
      data: dto,
      select: branchSelect,
    });
  }
}
