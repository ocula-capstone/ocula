import { branches, PASAY, TAGUIG } from '@/mocks/data/branches';
import { readSavedList, writeSavedList } from '@/mocks/data/storage';
import type { AuthUser, Role } from '@/types/auth';

export interface MockUser {
  id: string;
  email: string;
  // Standard form +639XXXXXXXXX. Seeded accounts and accounts saved before phones existed have none.
  phone: string | null;
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
    phone: null,
    password: 'password123',
    fullName: 'Ada Admin',
    role: 'admin',
    mustChangePassword: false,
    branchIds: [],
  },
  {
    id: 'u-staff',
    email: 'staff@ocula.test',
    phone: null,
    password: 'password123',
    fullName: 'Sam Staff',
    role: 'staff',
    mustChangePassword: false,
    branchIds: [PASAY.id],
  },
  {
    id: 'u-staff-taguig',
    email: 'staff.taguig@ocula.test',
    phone: null,
    password: 'password123',
    fullName: 'Tala Staff',
    role: 'staff',
    mustChangePassword: false,
    branchIds: [TAGUIG.id],
  },
  {
    // A temporary password issued by staff: must change it before using the app.
    id: 'u-staff-temp',
    email: 'staff.temp@ocula.test',
    phone: null,
    password: 'password123',
    fullName: 'Tess Temp',
    role: 'staff',
    mustChangePassword: true,
    branchIds: [PASAY.id],
  },
  {
    id: 'u-doctor-temp',
    email: 'doctor.temp@ocula.test',
    phone: null,
    password: 'password123',
    fullName: 'Dr. Theo Temp',
    role: 'optometrist',
    mustChangePassword: true,
    branchIds: [PASAY.id, TAGUIG.id],
  },
  {
    // A patient whose account staff created: temporary password, same rule as staff.
    id: 'u-patient-temp',
    email: 'patient.temp@ocula.test',
    phone: null,
    password: 'password123',
    fullName: 'Pia Temp',
    role: 'patient',
    mustChangePassword: true,
    branchIds: [],
  },
  {
    id: 'u-doctor',
    email: 'doctor@ocula.test',
    phone: null,
    password: 'password123',
    fullName: 'Dr. Olivia Optometrist',
    role: 'optometrist',
    mustChangePassword: false,
    branchIds: [PASAY.id, TAGUIG.id],
  },
  {
    id: 'u-patient',
    email: 'patient@ocula.test',
    phone: null,
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
  const { id, email, phone, password, fullName, role, mustChangePassword, branchIds } =
    entry as Record<string, unknown>;
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
    phone: typeof phone === 'string' ? phone : null,
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

// A seeded account lives in code, but a changed password or cleared temporary-password flag
// must survive a reload, as it would on a real server. Saved values are applied over the defaults.
const SEEDED_CHANGES_KEY = 'ocula.mock.seededChanges';
for (const entry of readSavedList(SEEDED_CHANGES_KEY)) {
  if (typeof entry !== 'object' || entry === null) continue;
  const { id, password, mustChangePassword } = entry as Record<string, unknown>;
  const account = seeded.find((u) => u.id === id);
  if (account && typeof password === 'string' && typeof mustChangePassword === 'boolean') {
    account.password = password;
    account.mustChangePassword = mustChangePassword;
  }
}

export const users: MockUser[] = [...seeded, ...registered];

// Call after changing an account (e.g. its password) so the change survives a reload.
export function saveUsers() {
  writeSavedList(
    USERS_KEY,
    users.filter((u) => !seededIds.has(u.id)),
  );
  // Seeded accounts live in code, so only the parts that can change at runtime are saved.
  writeSavedList(
    SEEDED_CHANGES_KEY,
    seeded.map(({ id, password, mustChangePassword }) => ({ id, password, mustChangePassword })),
  );
}

export function addRegisteredUser(user: MockUser) {
  users.push(user);
  saveUsers();
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
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    branches: assigned.map(({ id, code, name }) => ({ id, code, name })),
  };
}
