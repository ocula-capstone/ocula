import { MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { canMarkNoShow } from '@/features/appointments/groups';
import {
  checkIn,
  markNoShow,
  reopenVisit,
  restoreVisit,
  startExam,
  undoCheckIn,
  undoStart,
} from '@/features/appointments/store';
import { recordsLink } from '@/features/patients/links';
import { showUndo } from '@/lib/undoToast';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/clinic';

// The main action of a row: one button, 44px tall, in the same column on every row.
const focus =
  'outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
const base = `inline-flex h-11 w-full items-center justify-center rounded-[10px] text-sm font-semibold ${focus}`;
const outlineBlue = `${base} border border-brand bg-surface text-brand-text hover:bg-brand/5`;
const solid = `${base} bg-brand text-white hover:bg-brand-hover`;
const outlineGrey = `${base} border border-slate-300 bg-surface text-ink hover:bg-page dark:border-white/20`;

export function MainAction({
  visit: v,
  onRebook,
}: {
  visit: Appointment;
  onRebook: (v: Appointment) => void;
}) {
  const hidden = <span className="sr-only"> for {v.patient}</span>;
  switch (v.status) {
    case 'Booked':
      return (
        <button type="button" className={outlineBlue} onClick={() => checkIn(v.id)}>
          Check in {hidden}
        </button>
      );
    case 'Waiting':
      return (
        <button type="button" className={solid} onClick={() => startExam(v.id)}>
          Start exam {hidden}
        </button>
      );
    case 'In exam':
    case 'Done':
      return (
        <Link to={recordsLink(v.patient)} className={outlineGrey}>
          Open records {hidden}
        </Link>
      );
    case 'Cancelled':
    case 'No-show':
      return (
        <button type="button" className={outlineBlue} onClick={() => onRebook(v)}>
          Rebook {hidden}
        </button>
      );
    default:
      return null;
  }
}

const item = 'min-h-11 px-3 text-sm';

// The "⋯" menu: what else can be done with this visit. The risky choices (cancel, no-show) come
// last, under a line, in red.
export function MoreMenu({
  visit: v,
  now,
  onReschedule,
  onCancel,
}: {
  visit: Appointment;
  now: number;
  onReschedule: (v: Appointment) => void;
  onCancel: (v: Appointment) => void;
}) {
  const record = (
    <DropdownMenuItem key="record" className={item} render={<Link to={recordsLink(v.patient)} />}>
      Open patient record
    </DropdownMenuItem>
  );
  const choose = (label: string, run: () => void, danger?: boolean) => (
    <DropdownMenuItem
      key={label}
      className={item}
      variant={danger ? 'destructive' : 'default'}
      onClick={run}
    >
      {label}
    </DropdownMenuItem>
  );
  const safe: React.ReactNode[] = [];
  const risky: React.ReactNode[] = [];
  switch (v.status) {
    case 'Booked':
      safe.push(
        choose('Reschedule', () => onReschedule(v)),
        record,
      );
      if (canMarkNoShow(v, new Date(now)))
        risky.push(choose('Mark as no-show', () => markNoShow(v.id), true));
      risky.push(choose('Cancel visit', () => onCancel(v), true));
      break;
    case 'Waiting':
      safe.push(
        record,
        choose('Undo check-in', () => undoCheckIn(v.id)),
      );
      risky.push(choose('Cancel visit', () => onCancel(v), true));
      break;
    case 'In exam':
      safe.push(
        record,
        choose('Undo start', () => undoStart(v.id)),
      );
      break;
    case 'Done':
      safe.push(
        record,
        choose('Reopen visit', () => reopenVisit(v.id)),
      );
      break;
    case 'Cancelled':
    case 'No-show':
      safe.push(
        record,
        choose('Restore visit', () => restoreVisit(v.id)),
      );
      if (v.status === 'No-show') {
        // shortcut: the recalls list is not saved anywhere yet, so this only says it was done.
        safe.push(choose('Add to recalls', () => showUndo(`${v.patient} added to recalls`)));
      }
      break;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More actions for ${v.patient}`}
        className={cn(
          'grid size-11 place-items-center rounded-[10px] text-subtle hover:bg-page hover:text-ink',
          focus,
        )}
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 p-1.5">
        {safe}
        {risky.length > 0 && <DropdownMenuSeparator />}
        {risky}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
