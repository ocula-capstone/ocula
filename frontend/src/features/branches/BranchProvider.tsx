import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { listBranches } from '@/api/branches';
import { useAuth } from '@/features/auth/auth-context';
import { BranchContext, type BranchContextValue } from '@/features/branches/branch-context';
import type { BranchRef } from '@/types/branch';

const storageKey = (userId: string) => `ocula.branch.${userId}`;

// Storage can be blocked (private window), so every access is wrapped.
function readStored(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function writeStored(userId: string, branchId: string) {
  try {
    localStorage.setItem(storageKey(userId), branchId);
  } catch {
    // The choice just won't survive a reload.
  }
}

// The stored branch if the user still works there, otherwise the first one.
function pickBranch(available: BranchRef[], storedId: string | null): BranchRef | null {
  return available.find((b) => b.id === storedId) ?? available[0] ?? null;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: allBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: listBranches,
    enabled: isAdmin,
  });

  const branches = useMemo<BranchRef[]>(
    () => (isAdmin ? (allBranches ?? []) : (user?.branches ?? [])),
    [isAdmin, allBranches, user?.branches],
  );

  const userId = user?.id;
  // The branch picked this session, tagged with who picked it so the next user never inherits it.
  // Before any pick, the saved choice from localStorage is used.
  const [chosen, setChosen] = useState<{ userId: string; branchId: string } | null>(null);
  const storedId = useMemo(() => {
    if (!userId) return null;
    return chosen?.userId === userId ? chosen.branchId : readStored(userId);
  }, [userId, chosen]);

  const current = pickBranch(branches, storedId);

  const setCurrent = useCallback(
    (id: string) => {
      if (!userId || !branches.some((b) => b.id === id)) return;
      writeStored(userId, id);
      setChosen({ userId, branchId: id });
    },
    [userId, branches],
  );

  const value = useMemo<BranchContextValue>(
    () => ({ branches, current, setCurrent }),
    [branches, current, setCurrent],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
