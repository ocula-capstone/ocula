import { afterEach, describe, expect, it, vi } from 'vitest';
import { listBranches } from '@/api/branches';
import type { Branch } from '@/types/branch';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const pasay: Branch = {
  id: 'b-pasay',
  code: 'PASAY',
  name: 'MRB Optical Clinic Pasay',
  address: null,
  phone: null,
  onlineBookingEnabled: true,
};

describe('listBranches', () => {
  it('asks GET /api/branches and returns the list as the server sent it', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify([pasay]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listBranches()).resolves.toEqual([pasay]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/branches',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
