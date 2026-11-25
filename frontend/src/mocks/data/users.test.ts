import { afterEach, describe, expect, it, vi } from 'vitest';
import { branches } from '@/mocks/data/branches';
import { toApiUser, users } from '@/mocks/data/users';

const PASAY = { id: 'b-pasay', code: 'PASAY', name: 'MRB Optical Clinic Pasay' };
const TAGUIG = { id: 'b-taguig', code: 'TAGUIG', name: 'MRB Optical Clinic Taguig' };

// Nothing is saved when this file loads, so these are only the seeded accounts.
const seededCount = users.length;

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('treat a branchIds that is not a list as no branches', async () => {
    localStorage.setItem(
      'ocula.mock.users',
      JSON.stringify([
        { ...savedAccount('u-null'), branchIds: null },
        { ...savedAccount('u-text'), branchIds: 'b-pasay' },
        { ...savedAccount('u-number'), branchIds: 5 },
      ]),
    );
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    for (const id of ['u-null', 'u-text', 'u-number']) {
      const account = fresh.users.find((u) => u.id === id);
      expect(account).toBeDefined();
      expect(fresh.toApiUser(account!).branches).toEqual([]);
    }
  });

  it('skip accounts with a missing or wrong field', async () => {
    localStorage.setItem(
      'ocula.mock.users',
      JSON.stringify([
        { ...savedAccount('u-bad-role'), role: 'superuser' },
        { ...savedAccount('u-no-name'), fullName: undefined },
        { ...savedAccount('u-bad-flag'), mustChangePassword: 'no' },
        savedAccount('u-fine'),
      ]),
    );
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    const ids = fresh.users.map((u) => u.id);
    expect(ids).toContain('u-fine');
    expect(ids).not.toContain('u-bad-role');
    expect(ids).not.toContain('u-no-name');
    expect(ids).not.toContain('u-bad-flag');
  });

  it('ignore a saved account that reuses a seeded id', async () => {
    localStorage.setItem(
      'ocula.mock.users',
      JSON.stringify([{ ...savedAccount('u-admin'), email: 'impostor@ocula.test' }]),
    );
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    expect(fresh.users).toHaveLength(seededCount);
    expect(fresh.users.some((u) => u.email === 'impostor@ocula.test')).toBe(false);
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
    fresh.addRegisteredUser({
      ...savedAccount('u-new'),
      role: 'patient',
      phone: null,
      branchIds: [],
    });
    const saved = JSON.parse(localStorage.getItem('ocula.mock.users') ?? '[]') as { id: string }[];
    expect(saved.map((u) => u.id)).toEqual(['u-new']);
  });

  it('keep a new account for the session when the browser refuses to save it', async () => {
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const account = {
      ...savedAccount('u-new'),
      role: 'patient' as const,
      phone: null,
      branchIds: [],
    };
    expect(() => fresh.addRegisteredUser(account)).not.toThrow();
    expect(fresh.users.some((u) => u.id === 'u-new')).toBe(true);
  });
});

describe('phone numbers', () => {
  it('are returned by toApiUser, and are null for seeded accounts', () => {
    expect(toApiUser(mockUser('staff@ocula.test')).phone).toBeNull();
    const withPhone = { ...mockUser('staff@ocula.test'), phone: '+639171234567' };
    expect(toApiUser(withPhone).phone).toBe('+639171234567');
  });

  it('load as null for accounts saved before phones existed', async () => {
    localStorage.setItem('ocula.mock.users', JSON.stringify([savedAccount('u-nophone')]));
    vi.resetModules();
    const fresh = await import('@/mocks/data/users');
    expect(fresh.users.find((u) => u.id === 'u-nophone')?.phone).toBeNull();
    localStorage.clear();
  });
});

describe('saveUsers', () => {
  it('keeps a changed password after a reload', async () => {
    vi.resetModules();
    const first = await import('@/mocks/data/users');
    const account = {
      ...savedAccount('u-pw'),
      role: 'patient' as const,
      phone: null,
      branchIds: [],
    };
    first.addRegisteredUser(account);
    account.password = 'new-password-1';
    first.saveUsers();

    vi.resetModules(); // a reload: the module reads the storage again
    const reloaded = await import('@/mocks/data/users');
    expect(reloaded.users.find((u) => u.id === 'u-pw')?.password).toBe('new-password-1');
    localStorage.clear();
  });
});

describe('changes to a seeded account', () => {
  it('survive a reload, like a real server keeping a changed password', async () => {
    vi.resetModules();
    const first = await import('@/mocks/data/users');
    const temp = first.users.find((u) => u.id === 'u-staff-temp')!;
    temp.password = 'new-password-1';
    temp.mustChangePassword = false;
    first.saveUsers();

    vi.resetModules(); // a reload: the module is rebuilt from code and storage
    const reloaded = await import('@/mocks/data/users');
    const again = reloaded.users.find((u) => u.id === 'u-staff-temp')!;
    expect(again.password).toBe('new-password-1');
    expect(again.mustChangePassword).toBe(false);
    localStorage.clear();
  });
});
