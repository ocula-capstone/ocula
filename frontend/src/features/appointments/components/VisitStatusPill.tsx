import type { VisitStatus } from '@/types/clinic';
import { cn } from '@/lib/utils';

// The status of a visit as one plain word in a pill. Always the word alone: waits and times belong
// under the patient's name. Every pill is the same size, so a column of them lines up; the colour
// backs the word up and is never the only cue.
const LOOK: Partial<Record<VisitStatus, string>> = {
  Booked: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  Waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200',
  'In exam': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200',
  Done: 'bg-green-100 text-green-800 dark:bg-green-400/15 dark:text-green-200',
  Cancelled:
    'border border-slate-300 bg-slate-100 text-slate-600 dark:border-white/20 dark:bg-white/10 dark:text-slate-300',
  'No-show': 'bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-200',
};

export function VisitStatusPill({ status }: { status: VisitStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-[30px] min-w-[104px] items-center justify-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap',
        LOOK[status] ?? LOOK.Booked,
      )}
    >
      {status}
    </span>
  );
}
