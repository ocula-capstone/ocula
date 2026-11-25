import { skipToken, useQuery } from '@tanstack/react-query';
import { useBranch } from '@/features/branches/branch-context';

// Every list or detail that belongs to a branch goes through this hook. The branch id is part of
// the cache key, so switching branch fetches fresh rows instead of showing the old branch's.
// The key has no user part: it is safe because the whole cache is cleared on logout.
export function useBranchQuery<T>(
  key: readonly unknown[],
  fetcher: (branchId: string) => Promise<T>,
) {
  const branchId = useBranch().current?.id;
  return useQuery({
    queryKey: ['branch', branchId, ...key],
    // skipToken = do not run (no branch chosen yet)
    queryFn: branchId ? () => fetcher(branchId) : skipToken,
  });
}
