import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { TokenService } from '../auth/token.service.js';
import {
  emailTaken,
  phoneTaken,
  rethrowUserConflict,
} from '../common/conflicts.js';
import { Page, pageArgs } from '../common/pagination.js';
import { hashPassword } from '../common/password.js';
import { temporaryPassword } from '../common/temporary-password.js';
import type { Prisma, Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  UpdateUserDto,
} from './dto/users.dto.js';

/** A staff, optometrist or admin account as the admin sees it. */
export interface StaffUserView {
  id: string;
  email: string | null;
  phone: string | null;
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
  phone: true,
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
  email: string | null;
  phone: string | null;
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
  phone: u.phone,
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
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<Page<StaffUserView>> {
    const search = query.search;
    const where: Prisma.UserWhereInput = {
      role: query.role ? query.role : { in: ['admin', 'staff', 'optometrist'] },
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.branchId
        ? { branches: { some: { branchId: query.branchId } } }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              {
                phone: {
                  contains: search.replace(/[\s-]/g, '').replace(/^0/, ''),
                },
              },
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
    actorId: string,
  ): Promise<{ user: StaffUserView; temporaryPassword: string }> {
    await this.assertEmailFree(dto.email);
    await this.assertPhoneFree(dto.phone);
    await this.assertBranchesExist(dto.branchIds);

    const { forcePasswordChange } = await this.settings.get();
    const password = temporaryPassword();
    let user: StaffRow;
    try {
      user = (await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          fullName: dto.fullName,
          role: dto.role,
          passwordHash: await hashPassword(password),
          mustChangePassword: forcePasswordChange,
          branches: { create: dto.branchIds.map((branchId) => ({ branchId })) },
        },
        select: staffSelect,
      })) as StaffRow;
    } catch (error) {
      rethrowUserConflict(error);
    }

    const view = toView(user);
    await this.audit.log({
      userId: actorId,
      action: 'user.create',
      entity: 'user',
      entityId: view.id,
      data: {
        email: view.email,
        phone: view.phone,
        role: view.role,
        branches: view.branches.map((b) => b.code),
      },
    });
    return { user: view, temporaryPassword: password };
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
          message:
            'The admin account can only have its name, email and phone changed.',
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

    const emailChanged = dto.email !== undefined && dto.email !== target.email;
    if (emailChanged) await this.assertEmailFree(dto.email!);
    const phoneChanged = dto.phone !== undefined && dto.phone !== target.phone;
    if (phoneChanged) await this.assertPhoneFree(dto.phone!);

    let user: StaffRow;
    try {
      user = (await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(emailChanged ? { email: dto.email } : {}),
          ...(phoneChanged ? { phone: dto.phone } : {}),
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
      })) as StaffRow;
    } catch (error) {
      rethrowUserConflict(error);
    }

    // A disabled account or a new role must not keep old sessions.
    const roleChanged = dto.role !== undefined && dto.role !== target.role;
    if (dto.isActive === false || roleChanged)
      await this.tokens.revokeAllForUser(id);

    const view = toView(user);
    const before = toView(target);
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of [
      'fullName',
      'email',
      'phone',
      'role',
      'isActive',
    ] as const) {
      if (before[key] !== view[key])
        changes[key] = { from: before[key], to: view[key] };
    }
    const codes = (u: StaffUserView) =>
      u.branches
        .map((b) => b.code)
        .sort()
        .join(',');
    if (dto.branchIds && codes(before) !== codes(view)) {
      changes.branches = { from: codes(before), to: codes(view) };
    }
    if (Object.keys(changes).length) {
      const action =
        'isActive' in changes
          ? view.isActive
            ? 'user.enable'
            : 'user.disable'
          : 'user.update';
      await this.audit.log({
        userId: actorId,
        action,
        entity: 'user',
        entityId: id,
        data: changes,
      });
    }
    return view;
  }

  /** Sets a new temporary password (shown once) and logs the user out everywhere. */
  async resetPassword(
    id: string,
    actorId: string,
  ): Promise<{ temporaryPassword: string }> {
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
    await this.audit.log({
      userId: actorId,
      action: 'user.reset_password',
      entity: 'user',
      entityId: id,
    });
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

  private async assertEmailFree(email: string): Promise<void> {
    const taken = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken) throw emailTaken();
  }

  private async assertPhoneFree(phone: string): Promise<void> {
    const taken = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (taken) throw phoneTaken();
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
}
