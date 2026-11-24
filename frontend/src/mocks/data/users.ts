import { branches, PASAY, TAGUIG } from '@/mocks/data/branches';
import { readSavedList, writeSavedList } from '@/mocks/data/storage';
import type { AuthUser, Role } from '@/types/auth';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  // Ids of the branches this person works at. Patients have none. An admin sees every branch
  // whatever this says, as on the real server.
  branchIds: string[];
}

const seeded: MockUser[] = [
  {
    id: 'u-admin',
    email: 'admin@ocula.test',
    password: 'password123',
    fullName: 'Ada Admin',
    role: 'admin',
    mustChangePassword: false,
    branchIds: [],
  },
  {
    id: 'u-staff',
    email: 'staff@ocula.test',
    password: 'password123',
    fullName: 'Sam Staff',
    role: 'staff',
    mustChangePassword: false,
    branchIds: [PASAY.id],
  },
  {
    id: 'u-staff-taguig',
    email: 'staff.taguig@ocula.test',
    password: 'password123',
    fullName: 'Tala Staff',
    role: 'staff',
    mustChangePassword: false,
    branchIds: [TAGUIG.id],
  },
  {
    id: 'u-doctor',
    email: 'doctor@ocula.test',
    password: 'password123',
    fullName: 'Dr. Olivia Optometrist',
    role: 'optometrist',
    mustChangePassword: false,
    branchIds: [PASAY.id, TAGUIG.id],
  },
  {
    id: 'u-patient',
    email: 'patient@ocula.test',
    password: 'password123',
    fullName: 'Pat Patient',
    role: 'patient',
    mustChangePassword: false,
    branchIds: [],
  },
];

const USERS_KEY = 'ocula.mock.users';
const seededIds = new Set(seeded.map((user) => user.id));

const ROLES: readonly string[] = ['admin', 'staff', 'optometrist', 'patient'];

// Turns one saved entry into an account, or null when any field has the wrong type or the id
// belongs to a seeded account. Accounts saved before branches existed have no branchIds, so
// they (and a branchIds that is not a list) get no branches.
function toMockUser(entry: unknown): MockUser | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const { id, email, password, fullName, role, mustChangePassword, branchIds } = entry as Record<
    string,
    unknown
  >;
  if (
    typeof id !== 'string' ||
    seededIds.has(id) ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof fullName !== 'string' ||
    typeof role !== 'string' ||
    !ROLES.includes(role) ||
    typeof mustChangePassword !== 'boolean'
  ) {
    return null;
  }
  return {
    id,
    email,
    password,
    fullName,
    role: role as Role,
    mustChangePassword,
    branchIds: Array.isArray(branchIds)
      ? branchIds.filter((branchId): branchId is string => typeof branchId === 'string')
      : [],
  };
}

// Accounts made through /register come back after a reload.
const registered = readSavedList(USERS_KEY)
  .map(toMockUser)
  .filter((user): user is MockUser => user !== null);

export const users: MockUser[] = [...seeded, ...registered];

export function addRegisteredUser(user: MockUser) {
  users.push(user);
  // Only registered accounts are saved; the seeded ones live in code.
  writeSavedList(
    USERS_KEY,
    users.filter((u) => !seededIds.has(u.id)),
  );
}

// The user as the real API returns it (login and GET /auth/me). Fields are copied one by one,
// so the password can never leak into a response.
export function toApiUser(user: MockUser): AuthUser {
  // The real server gives an admin every branch; everyone else gets the ones assigned to them.
  const assigned =
    user.role === 'admin'
      ? branches
      : branches.filter((branch) => user.branchIds.includes(branch.id));
  return {
    id: user.id,
    email: user.email,
    phone: null,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    branches: assigned.map(({ id, code, name }) => ({ id, code, name })),
  };
}
