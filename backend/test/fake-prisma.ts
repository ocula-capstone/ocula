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
  email: string | null;
  phone: string | null;
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
  onlineBookingEnabled: boolean;
}

export interface AuditRow {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  data: unknown;
  createdAt: Date;
}

interface SettingsRow {
  id: string;
  recallIntervalMonths: number;
  recallWindowDays: number;
  lowStockThreshold: number;
  forcePasswordChange: boolean;
  updatedById: string | null;
  updatedAt: Date;
}

type Where = Record<string, unknown>;

/** Like Prisma, fields set to undefined are left unchanged. */
const assignDefined = (row: object, data: object) =>
  Object.assign(
    row,
    Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  );

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !(v instanceof Date);

function matchValue(value: unknown, condition: unknown): boolean {
  if (!isObject(condition)) return value === condition;
  if ('in' in condition) return (condition.in as unknown[]).includes(value);
  if ('not' in condition) return value !== condition.not;
  if ('equals' in condition) {
    return condition.mode === 'insensitive'
      ? (typeof value === 'string' ? value : '').toLowerCase() ===
          String(condition.equals).toLowerCase()
      : value === condition.equals;
  }
  if ('startsWith' in condition) {
    return (
      typeof value === 'string' &&
      value.startsWith(String(condition.startsWith))
    );
  }
  if ('gte' in condition || 'lte' in condition) {
    const v = value instanceof Date ? value.getTime() : Number(value);
    const gte = condition.gte as Date | undefined;
    const lte = condition.lte as Date | undefined;
    return (!gte || v >= gte.getTime()) && (!lte || v <= lte.getTime());
  }
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
  const patients: (Record<string, unknown> & {
    id: string;
    userId: string | null;
  })[] = [];
  const rateLimits: {
    key: string;
    count: number;
    windowStart: Date;
    lockedUntil: Date | null;
  }[] = [];
  const passwordResetTokens: ResetRow[] = [];
  const branches: BranchRow[] = [];
  const userBranches: { userId: string; branchId: string }[] = [];
  const auditLogs: AuditRow[] = [];
  const settings: SettingsRow[] = [];
  const defaultSettings = (): SettingsRow => ({
    id: 'default',
    recallIntervalMonths: 12,
    recallWindowDays: 30,
    lowStockThreshold: 3,
    forcePasswordChange: true,
    updatedById: null,
    updatedAt: new Date(),
  });

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

  const patientMatches = makeMatcher({
    user: (row, cond) => {
      const u = users.find((x) => x.id === row.userId);
      return Boolean(u && plain(u, cond));
    },
  });

  const withPatientRelations = (p: (typeof patients)[number]) => {
    const u = users.find((x) => x.id === p.userId);
    return {
      ...p,
      homeBranch: (() => {
        const b = branches.find((x) => x.id === p.homeBranchId);
        return b ? { id: b.id, code: b.code, name: b.name } : null;
      })(),
      user: u
        ? { id: u.id, email: u.email, phone: u.phone, isActive: u.isActive }
        : null,
    };
  };

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
    auditLogs,
    settings,

    /** Test helper: add a branch directly. */
    addBranch(
      row: Pick<BranchRow, 'id' | 'code' | 'name'> & Partial<BranchRow>,
    ) {
      const branch: BranchRow = {
        address: null,
        phone: null,
        onlineBookingEnabled: true,
        ...row,
      };
      branches.push(branch);
      return branch;
    },

    clinicSetting: {
      upsert: async ({ where }: { where: Where }) => {
        let row = settings.find((r) => plain(r, where));
        if (!row) {
          row = defaultSettings();
          settings.push(row);
        }
        return { ...row };
      },
      update: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<SettingsRow>;
      }) => {
        const row = settings.find((r) => plain(r, where));
        if (!row) throw new Error('not found');
        assignDefined(row, { ...data, updatedAt: new Date() });
        return { ...row };
      },
    },

    auditLog: {
      create: async ({
        data,
      }: {
        data: Omit<AuditRow, 'id' | 'createdAt'>;
      }) => {
        const row: AuditRow = {
          id: randomUUID(),
          createdAt: new Date(),
          ...data,
          data: data.data ?? null,
        };
        auditLogs.push(row);
        return row;
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
        auditLogs
          .filter((a) => plain(a, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(skip, take === undefined ? undefined : skip + take)
          .map((a) => {
            const u = users.find((x) => x.id === a.userId);
            return {
              ...a,
              user: u
                ? {
                    id: u.id,
                    fullName: u.fullName,
                    email: u.email,
                    role: u.role,
                  }
                : null,
            };
          }),
      count: async ({ where }: { where?: Where } = {}) =>
        auditLogs.filter((a) => plain(a, where)).length,
    },
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
        fullName: row.email ?? 'Someone',
        phone: null,
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
      findUnique: async ({ where }: { where: Where }) => {
        const b = branches.find((row) => plain(row, where));
        return b ? { ...b } : null;
      },
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
        assignDefined(row, data);
        return { ...row };
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
        if (data.email && users.some((u) => u.email === data.email))
          throw uniqueError('email');
        if (data.phone && users.some((u) => u.phone === data.phone))
          throw uniqueError('phone');
        const { patient, branches: nested, ...rest } = data;
        const row = {
          id: randomUUID(),
          email: null,
          phone: null,
          mustChangePassword: false,
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          ...rest,
        } as UserRow;
        users.push(row);
        if (patient) {
          const nested = patient as {
            create?: Record<string, unknown>;
            connect?: { id: string };
          };
          if (nested.connect) {
            const existing = patients.find((p) => p.id === nested.connect!.id);
            if (existing) existing.userId = row.id;
          } else {
            patients.push({
              id: randomUUID(),
              patientNo: patients.length + 1,
              ...nested.create,
              userId: row.id,
            });
          }
        }
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
        if (
          rest.email &&
          users.some((u) => u.email === rest.email && u.id !== row.id)
        ) {
          throw uniqueError('email');
        }
        if (
          rest.phone &&
          users.some((u) => u.phone === rest.phone && u.id !== row.id)
        ) {
          throw uniqueError('phone');
        }
        assignDefined(row, rest);
        applyBranches(row.id, nested);
        return withBranches(row);
      },
    },

    patient: {
      findMany: async ({
        where,
        skip = 0,
        take,
      }: {
        where?: Where;
        skip?: number;
        take?: number;
      }) =>
        patients
          .filter((p) => patientMatches(p, where))
          .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)))
          .slice(skip, take === undefined ? undefined : skip + take)
          .map(withPatientRelations),
      count: async ({ where }: { where?: Where } = {}) =>
        patients.filter((p) => patientMatches(p, where)).length,
      findUnique: async ({ where }: { where: Where }) => {
        const p = patients.find((row) => plain(row, where));
        return p ? withPatientRelations(p) : null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: randomUUID(),
          patientNo: patients.length + 1,
          userId: null,
          phone: null,
          birthDate: null,
          sex: null,
          address: null,
          occupation: null,
          companyName: null,
          homeBranchId: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        patients.push(row);
        return withPatientRelations(row);
      },
      update: async ({
        where,
        data,
      }: {
        where: Where;
        data: Record<string, unknown>;
      }) => {
        const row = patients.find((p) => plain(p, where));
        if (!row) throw new Error('not found');
        assignDefined(row, { ...data, updatedAt: new Date() });
        return withPatientRelations(row);
      },
    },

    rateLimits,

    rateLimit: {
      findUnique: async ({ where }: { where: Where }) =>
        rateLimits.find((r) => plain(r, where)) ?? null,
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: Where;
        create: (typeof rateLimits)[number];
        update: Partial<(typeof rateLimits)[number]>;
      }) => {
        const row = rateLimits.find((r) => plain(r, where));
        if (row) return assignDefined(row, update);
        rateLimits.push({ ...create });
        return create;
      },
      deleteMany: async ({ where }: { where: Where }) => {
        const before = rateLimits.length;
        for (let i = rateLimits.length - 1; i >= 0; i--) {
          if (plain(rateLimits[i], where)) rateLimits.splice(i, 1);
        }
        return { count: before - rateLimits.length };
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
