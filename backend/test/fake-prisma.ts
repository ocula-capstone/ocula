import { randomUUID } from 'node:crypto';

/**
 * A small in-memory stand-in for PrismaService, covering only the queries the app uses so far.
 * Lets the e2e tests run the real controllers, guards and services without a database.
 * It ignores `select` (services map rows to their own response shapes) and supports the
 * `where` forms used in the code: equality, { in }, { not }, { contains, mode }, OR,
 * and users' `branches: { some: { branchId } }`.
 */
export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'admin' | 'staff' | 'optometrist' | 'patient';
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface RefreshRow {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
  userAgent?: string;
}

interface ResetRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface BranchRow {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
}

type Where = Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !(v instanceof Date);

function matchValue(value: unknown, condition: unknown): boolean {
  if (!isObject(condition)) return value === condition;
  if ('in' in condition) return (condition.in as unknown[]).includes(value);
  if ('not' in condition) return value !== condition.not;
  if ('contains' in condition) {
    const needle = String(condition.contains);
    const hay = typeof value === 'string' ? value : '';
    return condition.mode === 'insensitive'
      ? hay.toLowerCase().includes(needle.toLowerCase())
      : hay.includes(needle);
  }
  return value === condition;
}

function makeMatcher(
  relations: Record<
    string,
    (row: Record<string, unknown>, cond: Where) => boolean
  > = {},
) {
  const matches = (row: object, where: Where = {}): boolean =>
    Object.entries(where).every(([key, condition]) => {
      if (key === 'OR')
        return (condition as Where[]).some((w) => matches(row, w));
      if (key in relations)
        return relations[key](
          row as Record<string, unknown>,
          condition as Where,
        );
      return matchValue((row as Record<string, unknown>)[key], condition);
    });
  return matches;
}

function uniqueError(field: string) {
  return Object.assign(new Error('Unique constraint'), {
    name: 'PrismaClientKnownRequestError',
    code: 'P2002',
    meta: { target: [field] },
  });
}

export function createFakePrisma() {
  const users: UserRow[] = [];
  const refreshTokens: RefreshRow[] = [];
  const patients: { id: string; userId: string }[] = [];
  const passwordResetTokens: ResetRow[] = [];
  const branches: BranchRow[] = [];
  const userBranches: { userId: string; branchId: string }[] = [];

  const plain = makeMatcher();
  const userMatches = makeMatcher({
    branches: (row, cond) => {
      const some = (cond as { some?: { branchId?: string } }).some;
      return userBranches.some(
        (ub) => ub.userId === row.id && ub.branchId === some?.branchId,
      );
    },
  });

  /** A user row with its branches attached, like Prisma's nested select. */
  const withBranches = (u: UserRow) => ({
    ...u,
    branches: userBranches
      .filter((ub) => ub.userId === u.id)
      .map((ub) => ({ branch: branches.find((b) => b.id === ub.branchId)! }))
      .sort((a, b) => a.branch.name.localeCompare(b.branch.name)),
  });

  type NestedBranches = {
    deleteMany?: object;
    create?: { branchId: string }[];
  };
  const applyBranches = (userId: string, nested?: NestedBranches) => {
    if (!nested) return;
    if (nested.deleteMany) {
      for (let i = userBranches.length - 1; i >= 0; i--) {
        if (userBranches[i].userId === userId) userBranches.splice(i, 1);
      }
    }
    for (const { branchId } of nested.create ?? [])
      userBranches.push({ userId, branchId });
  };

  return {
    users,
    refreshTokens,
    patients,
    passwordResetTokens,
    branches,
    userBranches,
    $queryRaw: async () => [{ ok: 1 }],
    $disconnect: async () => undefined,
    $transaction: async (queries: Promise<unknown>[]) => Promise.all(queries),

    /** Test helper: add a user directly. */
    addUser(
      row: Partial<UserRow> & Pick<UserRow, 'email' | 'passwordHash' | 'role'>,
      branchIds: string[] = [],
    ) {
      const user: UserRow = {
        id: randomUUID(),
        fullName: row.email,
        mustChangePassword: false,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        ...row,
      };
      users.push(user);
      branchIds.forEach((branchId) =>
        userBranches.push({ userId: user.id, branchId }),
      );
      return user;
    },

    branch: {
      findMany: async ({ where }: { where?: Where } = {}) =>
        branches
          .filter((b) => plain(b, where))
          .sort((a, b) => a.name.localeCompare(b.name)),
      findUnique: async ({ where }: { where: Where }) =>
        branches.find((b) => plain(b, where)) ?? null,
      count: async ({ where }: { where?: Where } = {}) =>
        branches.filter((b) => plain(b, where)).length,
      update: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<BranchRow>;
      }) => {
        const row = branches.find((b) => plain(b, where));
        if (!row) throw new Error('not found');
        Object.assign(row, data);
        return row;
      },
    },

    user: {
      findUnique: async ({ where }: { where: Where }) => {
        const u = users.find((row) => userMatches(row, where));
        return u ? withBranches(u) : null;
      },
      findMany: async ({
        where,
        skip = 0,
        take,
      }: {
        where?: Where;
        skip?: number;
        take?: number;
      }) =>
        users
          .filter((u) => userMatches(u, where))
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
          .slice(skip, take === undefined ? undefined : skip + take)
          .map(withBranches),
      count: async ({ where }: { where?: Where } = {}) =>
        users.filter((u) => userMatches(u, where)).length,
      create: async ({
        data,
      }: {
        data: Partial<UserRow> & {
          patient?: unknown;
          branches?: NestedBranches;
        };
      }) => {
        if (users.some((u) => u.email === data.email))
          throw uniqueError('email');
        const { patient, branches: nested, ...rest } = data;
        const row: UserRow = {
          id: randomUUID(),
          mustChangePassword: false,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          ...(rest as Pick<
            UserRow,
            'email' | 'passwordHash' | 'fullName' | 'role'
          >),
        };
        users.push(row);
        if (patient) patients.push({ id: randomUUID(), userId: row.id });
        applyBranches(row.id, nested);
        return withBranches(row);
      },
      update: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<UserRow> & { branches?: NestedBranches };
      }) => {
        const row = users.find((u) => userMatches(u, where));
        if (!row) throw new Error('not found');
        const { branches: nested, ...rest } = data;
        Object.assign(row, rest);
        applyBranches(row.id, nested);
        return withBranches(row);
      },
    },

    passwordResetToken: {
      findUnique: async ({ where }: { where: Where }) =>
        passwordResetTokens.find((t) => plain(t, where)) ?? null,
      create: async ({ data }: { data: Omit<ResetRow, 'id' | 'usedAt'> }) => {
        const row: ResetRow = { id: randomUUID(), usedAt: null, ...data };
        passwordResetTokens.push(row);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<ResetRow>;
      }) => {
        const rows = passwordResetTokens.filter((t) => plain(t, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },

    refreshToken: {
      findUnique: async ({
        where,
        include,
      }: {
        where: Where;
        include?: { user?: unknown };
      }) => {
        const row = refreshTokens.find((t) => plain(t, where));
        if (!row) return null;
        return include?.user
          ? { ...row, user: users.find((u) => u.id === row.userId) }
          : row;
      },
      create: async ({
        data,
      }: {
        data: Omit<RefreshRow, 'id' | 'revokedAt' | 'replacedBy'>;
      }) => {
        const row: RefreshRow = {
          id: randomUUID(),
          revokedAt: null,
          replacedBy: null,
          ...data,
        };
        refreshTokens.push(row);
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<RefreshRow>;
      }) => {
        const row = refreshTokens.find((t) => plain(t, where));
        if (!row) throw new Error('not found');
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<RefreshRow>;
      }) => {
        const rows = refreshTokens.filter((t) => plain(t, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
  };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
