import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * The branch guard: staff and optometrists only work with their own branches' data.
 * The admin sees every branch. Patients have no branches here (their own data is checked elsewhere).
 */
@Injectable()
export class BranchAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Branch ids this user may see, or null for "every branch" (admin). */
  async allowedBranchIds(user: AuthUser): Promise<string[] | null> {
    if (user.role === 'admin') return null;
    if (user.role === 'patient') return [];
    const rows = await this.prisma.userBranch.findMany({
      where: { userId: user.id },
      select: { branchId: true },
    });
    return rows.map((r: { branchId: string }) => r.branchId);
  }

  async canAccess(user: AuthUser, branchId: string): Promise<boolean> {
    const allowed = await this.allowedBranchIds(user);
    return allowed === null || allowed.includes(branchId);
  }

  /** Throws 403 branch_forbidden unless the user works at this branch. */
  async assertAccess(user: AuthUser, branchId: string): Promise<void> {
    if (!(await this.canAccess(user, branchId))) {
      throw new ForbiddenException({
        error: {
          code: 'branch_forbidden',
          message: 'You do not work at this branch.',
        },
      });
    }
  }

  /** A Prisma `branchId` filter for list queries: the given branch (checked) or all allowed ones. */
  async branchFilter(
    user: AuthUser,
    branchId?: string,
  ): Promise<string | { in: string[] } | undefined> {
    if (branchId) {
      await this.assertAccess(user, branchId);
      return branchId;
    }
    const allowed = await this.allowedBranchIds(user);
    return allowed === null ? undefined : { in: allowed };
  }
}
