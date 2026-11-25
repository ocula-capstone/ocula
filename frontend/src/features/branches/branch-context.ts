import { createContext, useContext } from 'react';
import type { BranchRef } from '@/types/branch';

export interface BranchContextValue {
  // Branches this person can work at (admin: all of them).
  branches: BranchRef[];
  // The branch being worked in. null when the person has no branch (e.g. a patient).
  current: BranchRef | null;
  // Ignored when the person does not work at that branch.
  setCurrent: (id: string) => void;
}

export const BranchContext = createContext<BranchContextValue | null>(null);

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used inside <BranchProvider>');
  return ctx;
}
