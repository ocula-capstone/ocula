import { randomUUID } from 'node:crypto';

/**
 * A tiny in-memory stand-in for PrismaService, covering only what the auth flow uses.
 * Lets the e2e tests run the real controllers, guards and services without a database.
 */
interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'admin' | 'staff' | 'optometrist' | 'patient';
  mustChangePassword: boolean;
  isActive: boolean;
  lastLoginAt: Date | null;
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

type Where = Record<string, unknown>;
const matches = (row: object, where: Where) =>
  Object.entries(where).every(
    ([k, v]) => (row as Record<string, unknown>)[k] === v,
  );

export function createFakePrisma() {
  const users: UserRow[] = [];
  const refreshTokens: RefreshRow[] = [];
  const patients: { id: string; userId: string }[] = [];

  return {
    users,
    refreshTokens,
    patients,
    $queryRaw: async () => [{ ok: 1 }],
    $disconnect: async () => undefined,

    user: {
      findUnique: async ({ where }: { where: Where }) =>
        users.find((u) => matches(u, where)) ?? null,
      create: async ({
        data,
      }: {
        data: Partial<UserRow> & { patient?: unknown };
      }) => {
        if (users.some((u) => u.email === data.email)) {
          throw Object.assign(new Error('Unique constraint'), {
            name: 'PrismaClientKnownRequestError',
            code: 'P2002',
            meta: { target: ['email'] },
          });
        }
        const { patient, ...rest } = data;
        const row: UserRow = {
          id: randomUUID(),
          mustChangePassword: false,
          isActive: true,
          lastLoginAt: null,
          ...(rest as Omit<
            UserRow,
            'id' | 'mustChangePassword' | 'isActive' | 'lastLoginAt'
          >),
        };
        users.push(row);
        if (patient) patients.push({ id: randomUUID(), userId: row.id });
        return row;
      },
      update: async ({
        where,
        data,
      }: {
        where: Where;
        data: Partial<UserRow>;
      }) => {
        const row = users.find((u) => matches(u, where));
        if (!row) throw new Error('not found');
        Object.assign(row, data);
        return row;
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
        const row = refreshTokens.find((t) => matches(t, where));
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
        const row = refreshTokens.find((t) => matches(t, where));
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
        const rows = refreshTokens.filter((t) => matches(t, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
  };
}

export type FakePrisma = ReturnType<typeof createFakePrisma>;
