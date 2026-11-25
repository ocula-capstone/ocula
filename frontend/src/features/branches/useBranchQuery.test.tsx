import { act, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useBranch, type BranchContextValue } from '@/features/branches/branch-context';
import { useBranchQuery } from '@/features/branches/useBranchQuery';
import { fakeUser, renderWithProviders } from '@/test/render';

const pasay = { id: 'b-pasay', code: 'PSY', name: 'Pasay' };
const taguig = { id: 'b-taguig', code: 'TGG', name: 'Taguig' };

let ctx!: BranchContextValue;
function Rows({ fetcher }: { fetcher: (id: string) => Promise<string[]> }) {
  const value = useBranch();
  // Copied after render (not during) so the test can call ctx.setCurrent.
  useEffect(() => {
    ctx = value;
  });
  const { data } = useBranchQuery(['patients'], fetcher);
  return <p>{data ? data.join(',') : 'loading'}</p>;
}

describe('useBranchQuery', () => {
  it('shows the new branch rows after a switch, never the old ones', async () => {
    const fetcher = vi.fn(async (id: string) => [`${id}-patient`]);
    renderWithProviders(<Rows fetcher={fetcher} />, {
      user: fakeUser({ role: 'optometrist', branches: [pasay, taguig] }),
    });
    await screen.findByText('b-pasay-patient');

    act(() => ctx.setCurrent('b-taguig'));

    await screen.findByText('b-taguig-patient');
    expect(screen.queryByText('b-pasay-patient')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when the user has no branch', async () => {
    const fetcher = vi.fn(async () => ['x']);
    renderWithProviders(<Rows fetcher={fetcher} />, {
      user: fakeUser({ role: 'patient', branches: [] }),
    });
    await waitFor(() => expect(screen.getByText('loading')).toBeTruthy());
    expect(fetcher).not.toHaveBeenCalled();
  });
});
