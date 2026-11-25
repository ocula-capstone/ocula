import { act, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as branchesApi from '@/api/branches';
import { useBranch, type BranchContextValue } from '@/features/branches/branch-context';
import { fakeUser, renderWithProviders } from '@/test/render';
import type { Branch } from '@/types/branch';

vi.mock('@/api/branches', () => ({ listBranches: vi.fn() }));

const pasay = { id: 'b-pasay', code: 'PSY', name: 'Pasay' };
const taguig = { id: 'b-taguig', code: 'TGG', name: 'Taguig' };

let ctx!: BranchContextValue;
function Probe() {
  const value = useBranch();
  // Copied after render (not during) so the tests can call ctx.setCurrent.
  useEffect(() => {
    ctx = value;
  });
  return <p>{value.current?.name ?? 'none'}</p>;
}

beforeEach(() => localStorage.clear());

describe('BranchProvider', () => {
  it('staff with one branch cannot switch to another', () => {
    renderWithProviders(<Probe />, { user: fakeUser({ branches: [pasay] }) });
    expect(screen.getByText('Pasay')).toBeTruthy();
    act(() => ctx.setCurrent('b-taguig'));
    expect(screen.getByText('Pasay')).toBeTruthy();
  });

  it('a user with two branches can switch, and the choice is stored per user', () => {
    renderWithProviders(<Probe />, {
      user: fakeUser({ id: 'u-doc', role: 'optometrist', branches: [pasay, taguig] }),
    });
    act(() => ctx.setCurrent('b-taguig'));
    expect(screen.getByText('Taguig')).toBeTruthy();
    expect(localStorage.getItem('ocula.branch.u-doc')).toBe('b-taguig');
  });

  it('restores the stored branch', () => {
    localStorage.setItem('ocula.branch.u-doc', 'b-taguig');
    renderWithProviders(<Probe />, {
      user: fakeUser({ id: 'u-doc', role: 'optometrist', branches: [pasay, taguig] }),
    });
    expect(screen.getByText('Taguig')).toBeTruthy();
  });

  it('refuses a stored branch the user does not work at', () => {
    localStorage.setItem('ocula.branch.u-1', 'b-taguig');
    renderWithProviders(<Probe />, { user: fakeUser({ branches: [pasay] }) });
    expect(screen.getByText('Pasay')).toBeTruthy();
  });

  it('a patient has no branch', () => {
    renderWithProviders(<Probe />, { user: fakeUser({ role: 'patient', branches: [] }) });
    expect(screen.getByText('none')).toBeTruthy();
  });

  it('admin gets the branch list from listBranches', async () => {
    const full: Branch[] = [pasay, taguig].map((b) => ({
      ...b,
      address: null,
      phone: null,
      onlineBookingEnabled: false,
    }));
    vi.mocked(branchesApi.listBranches).mockResolvedValue(full);
    renderWithProviders(<Probe />, { user: fakeUser({ role: 'admin', branches: [] }) });
    await waitFor(() => expect(ctx.branches).toHaveLength(2));
    expect(screen.getByText('Pasay')).toBeTruthy();
  });
});
