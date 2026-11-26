import { CalendarPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/common/Avatar';
import { outlineButton } from '@/components/common/buttons';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { formatLastVisit, recallStatus } from '@/features/patients/format';
import { formatPesoShort } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { PatientSummary } from '@/types/clinic';

// The one word on a card's badge: what needs doing about this patient, most urgent first.
function standing(p: PatientSummary, today: string): { text: string; tone: StatusTone } {
  const { tone } = recallStatus(p.nextRecall, today);
  if (tone === 'overdue') return { text: 'Overdue', tone: 'danger' };
  if (tone === 'today') return { text: 'Due today', tone: 'warning' };
  if (p.balance > 0) return { text: 'Has balance', tone: 'warning' };
  return { text: 'Up to date', tone: 'success' };
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="min-w-0 text-[13px]">
      <span className="text-subtle">{label}:</span>{' '}
      <span className="font-medium text-ink">{children}</span>
    </p>
  );
}

// The patients as cards, three across on a wide screen: initials, name and ID, a status badge, then
// branch, phone, last visit, total visits, next recall and balance. Staff get the Book a visit button.
export function PatientCards({
  patients,
  today,
  isStaff,
}: {
  patients: PatientSummary[];
  today: string;
  isStaff: boolean;
}) {
  return (
    <ul
      aria-label="Patients"
      className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {patients.map((p) => {
        const badge = standing(p, today);
        const recall = recallStatus(p.nextRecall, today);
        return (
          <li
            key={p.id}
            className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar name={p.name} className="size-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-ink">{p.name}</p>
                <p className="text-[13px] text-subtle tabular-nums">{p.id}</p>
              </div>
              <StatusBadge tone={badge.tone}>{badge.text}</StatusBadge>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 min-[360px]:grid-cols-2">
              <Detail label="Branch">{p.branch}</Detail>
              <Detail label="Phone">
                <span className="tabular-nums">{p.phone}</span>
              </Detail>
              <Detail label="Last visit">{formatLastVisit(p.lastVisit, today)}</Detail>
              <Detail label="Visits">{p.visits}</Detail>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 min-[360px]:col-span-2">
                <Detail label="Next recall">
                  <span
                    className={cn(
                      (recall.tone === 'overdue' || recall.tone === 'today') &&
                        'font-semibold text-amber-800 dark:text-amber-300',
                    )}
                  >
                    {recall.text}
                  </span>
                </Detail>
                {p.balance > 0 && (
                  <Detail label="Balance">
                    <span className="font-semibold text-error tabular-nums">
                      {formatPesoShort(p.balance)}
                    </span>
                  </Detail>
                )}
              </div>
            </div>
            {isStaff && (
              <Link
                to="/staff/appointments"
                aria-label={`Book a visit for ${p.name}`}
                className={cn(outlineButton, 'mt-auto w-full gap-2')}
              >
                <CalendarPlus aria-hidden className="size-[18px]" strokeWidth={1.8} />
                Book a visit
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
