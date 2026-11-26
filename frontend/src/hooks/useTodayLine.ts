import { useBranch } from '@/features/branches/branch-context';
import { formatManilaToday } from '@/lib/dates';

// "Wednesday, November 25 · MRB Optical Clinic Pasay" for page headers; the date alone without a branch.
export function useTodayLine(): string {
  const { current } = useBranch();
  return [formatManilaToday(), current?.name].filter(Boolean).join(' · ');
}
