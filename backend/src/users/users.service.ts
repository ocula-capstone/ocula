import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TokenService } from '../auth/token.service.js';
import { Page, pageArgs } from '../common/pagination.js';
import { hashPassword } from '../common/password.js';
import { temporaryPassword } from '../common/temporary-password.js';
import type { Prisma, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/users.dto.js';

/** A staff, optometrist or admin account as the admin sees it. */
export interface StaffUserView {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  branches: { id: string; code: string; name: string }[];
}

const staffSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  branches: {
    select: { branch: { select: { id: true, code: true, name: true } } },
  },
} as const;

type StaffRow = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  branches: { branch: { id: string; code: string; name: string } }[];
};

const toView = (u: StaffRow): StaffUserView => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  isActive: u.isActive,
  mustChangePassword: u.mustChangePassword,
  lastLoginAt: u.lastLoginAt,
  createdAt: u.createdAt,
  branches: u.branches.map((b) => b.branch),
});

const notFound = () =>
  new NotFoundException({
    error: { code: 'not_found', message: 'User not found.' },
  });

/** Clinic accounts (admin, staff, optometrists). Patients are managed in the patients module. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<Page<StaffUserView>> {
    const where: Prisma.UserWhereInput = {
      role: query.role ? query.role : { in: ['admin', 'staff', 'optometrist'] },
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.branchId
        ? { branches: { some: { branchId: query.branchId } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: staffSelect,
        orderBy: { fullName: 'asc' },
        ...pageArgs(query),
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: (rows as StaffRow[]).map(toView),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async get(id: string): Promise<StaffUserView> {
    return toView(await this.findStaff(id));
  }

  /** Creates the account with a temporary password, returned only in this response. */
  async create(
    dto: CreateUserDto,
  ): Promise<{ user: StaffUserView; temporaryPassword: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw this.emailTaken();
    await this.assertBranchesExist(dto.branchIds);

    const password = temporaryPassword();
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          role: dto.role,
          passwordHash: await hashPassword(password),
          mustChangePassword: true,
          branches: { create: dto.branchIds.map((branchId) => ({ branchId })) },
        },
        select: staffSelect,
      });
      return { user: toView(user as StaffRow), temporaryPassword: password };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw this.emailTaken();
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
  ): Promise<StaffUserView> {
    const target = await this.findStaff(id);

    if (
      target.role === 'admin' &&
      (dto.role || dto.isActive === false || dto.branchIds)
    ) {
      throw new ForbiddenException({
        error: {
          code: 'admin_protected',
          message: 'The admin account can only have its name changed.',
        },
      });
    }
    if (id === actorId && dto.isActive === false) {
      throw new ForbiddenException({
        error: {
          code: 'cannot_disable_self',
          message: 'You cannot disable your own account.',
        },
      });
    }
    if (dto.branchIds) await this.assertBranchesExist(dto.branchIds);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.branchIds
          ? {
              branches: {
                deleteMany: {},
                create: dto.branchIds.map((branchId) => ({ branchId })),
              },
            }
          : {}),
      },
      select: staffSelect,
    });

    // A disabled account or a new role must not keep old sessions.
    const roleChanged = dto.role !== undefined && dto.role !== target.role;
    if (dto.isActive === false || roleChanged)
      await this.tokens.revokeAllForUser(id);

    return toView(user as StaffRow);
  }

  /** Sets a new temporary password (shown once) and logs the user out everywhere. */
  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const target = await this.findStaff(id);
    if (target.role === 'admin') {
      throw new ForbiddenException({
        error: {
          code: 'admin_protected',
          message:
            'Use "Forgot password" or "Change password" for the admin account.',
        },
      });
    }
    const password = temporaryPassword();
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    await this.tokens.revokeAllForUser(id);
    return { temporaryPassword: password };
  }

  private async findStaff(id: string): Promise<StaffRow> {
    const user = (await this.prisma.user.findUnique({
      where: { id },
      select: staffSelect,
    })) as StaffRow | null;
    if (!user || user.role === 'patient') throw notFound();
    return user;
  }

  private async assertBranchesExist(branchIds: string[]): Promise<void> {
    const count = await this.prisma.branch.count({
      where: { id: { in: branchIds } },
    });
    if (count !== branchIds.length) {
      throw new UnprocessableEntityException({
        error: {
          code: 'validation_failed',
          message: 'Please check the highlighted fields.',
          fields: { branchIds: 'One or more branches do not exist.' },
        },
      });
    }
  }

  private emailTaken() {
    return new ConflictException({
      error: {
        code: 'email_taken',
        message: 'An account with this email already exists.',
        fields: { email: 'An account with this email already exists.' },
      },
    });
  }
}
