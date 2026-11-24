import { branches, PASAY, TAGUIG } from '@/mocks/data/branches';
import { readSavedList } from '@/mocks/data/storage';
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

const isSavedUser = (value: unknown): value is Partial<MockUser> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<MockUser>).id === 'string' &&
  typeof (value as Partial<MockUser>).email === 'string' &&
  typeof (value as Partial<MockUser>).password === 'string';

// Accounts made through /register come back after a reload. Saved entries that are not usable
// accounts are skipped, and accounts saved before branches existed get no branches.
const registered = readSavedList(USERS_KEY)
  .filter(isSavedUser)
  .map((saved) => ({ branchIds: [], ...saved }) as MockUser);

export const users: MockUser[] = [...seeded, ...registered];

export function addRegisteredUser(user: MockUser) {
  users.push(user);
  // Only registered accounts are saved; the seeded ones live in code.
  localStorage.setItem(USERS_KEY, JSON.stringify(users.filter((u) => !seededIds.has(u.id))));
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
