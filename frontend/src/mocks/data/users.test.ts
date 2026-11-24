import { describe, expect, it, vi } from 'vitest';
import { branches } from '@/mocks/data/branches';
import { toApiUser, users } from '@/mocks/data/users';

const PASAY = { id: 'b-pasay', code: 'PASAY', name: 'MRB Optical Clinic Pasay' };
const TAGUIG = { id: 'b-taguig', code: 'TAGUIG', name: 'MRB Optical Clinic Taguig' };

// Nothing is saved when this file loads, so these are only the seeded accounts.
const seededCount = users.length;

const savedAccount = (id: string) => ({
  id,
  email: `${id}@ocula.test`,
  password: 'password123',
  fullName: 'Saved Account',
  role: 'patient',
  mustChangePassword: false,
});

function mockUser(email: string) {
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No mock user ${email}`);
  return user;
}

describe('toApiUser', () => {
  it('gives each person their own branches, as id, code and name only', () => {
    expect(toApiUser(mockUser('admin@ocula.test')).branches).toEqual([PASAY, TAGUIG]);
    expect(toApiUser(mockUser('doctor@ocula.test')).branches).toEqual([PASAY, TAGUIG]);
    expect(toApiUser(mockUser('staff@ocula.test')).branches).toEqual([PASAY]);
    expect(toApiUser(mockUser('staff.taguig@ocula.test')).branches).toEqual([TAGUIG]);
    expect(toApiUser(mockUser('patient@ocula.test')).branches).toEqual([]);
  });

  it('gives an admin every branch even when none are assigned, like the real server', () => {
    const admin = { ...mockUser('admin@ocula.test'), branchIds: [] };
    expect(toApiUser(admin).branches).toEqual([PASAY, TAGUIG]);
  });

  it('never includes the password', () => {
    expect(toApiUser(mockUser('staff@ocula.test'))).not.toHaveProperty('password');
  });

  it('has the same fields the real GET /auth/me returns', () => {
    expect(Object.keys(toApiUser(mockUser('staff@ocula.test'))).sort()).toEqual([
      'branches',
      'email',
      'fullName',
      'id',
      'mustChangePassword',
      'phone',
      'role',
    ]);
  });
});

describe('seed data', () => {
  it('only assigns branches that exist', () => {
    const known = new Set(branches.map((b) => b.id));
    for (const user of users) {
      for (const id of user.branchIds) expect(known.has(id)).toBe(true);
    }
  });

  it('lists branches by name, like the real server', () => {
    const names = branches.map((b) => b.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

describe('accounts saved in the browser', () => {
  it('load as having no branches when they were saved before branches existed', async () => {
    localStorage.setItem('ocula.mock.users', JSON.stringify([savedAccount('u-old')]));
    vi.resetModules(); // load the module again so it reads the storage above
    const fresh = await import('@/mocks/data/users');
    const old = fresh.users.find((u) => u.id === 'u-old');
    expect(old).toBeDefined();
    expect(fresh.toApiUser(old!).branches).toEqual([]);
  });

  it('skip entries that are not usable accounts and keep the good ones', async () => {
    localStorage.setItem(
      'ocula.mock.users',
      JSON.stringify([{}, 'junk', null, { id: 'u-no-password' }, savedAccount('u-ok')]),
    );
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    expect(fresh.users).toHaveLength(seededCount + 1);
    expect(fresh.users.some((u) => u.id === 'u-ok')).toBe(true);
  });

  it('start with only the seeded accounts when the saved text is corrupt', async () => {
    localStorage.setItem('ocula.mock.users', '{not json');
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    expect(fresh.users).toHaveLength(seededCount);
  });

  it('save only registered accounts, never the seeded ones', async () => {
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    fresh.addRegisteredUser({ ...savedAccount('u-new'), role: 'patient', branchIds: [] });
    const saved = JSON.parse(localStorage.getItem('ocula.mock.users') ?? '[]') as { id: string }[];
    expect(saved.map((u) => u.id)).toEqual(['u-new']);
  });
});
