import { CalendarPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/common/Avatar';
import { iconOutlineButton } from '@/components/common/buttons';
import type { Column } from '@/components/common/DataTable';
import { formatLastVisit, recallStatus } from '@/features/patients/format';
import { formatPesoShort } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { PatientSummary } from '@/types/clinic';

// The columns of the patient table. Staff also get a button at the end of each row.
export function patientColumns(today: string, isStaff: boolean): Column<PatientSummary>[] {
  const columns: Column<PatientSummary>[] = [
    {
      key: 'patient',
      header: 'Patient',
      cell: (p) => (
        <span className="flex items-center gap-3">
          <Avatar name={p.name} />
          <span>
            <span className="block text-sm font-semibold text-ink">{p.name}</span>
            <span className="block text-[13px] font-normal text-subtle">{p.id}</span>
          </span>
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (p) => <span className="tabular-nums">{p.phone}</span> },
    { key: 'last', header: 'Last visit', cell: (p) => formatLastVisit(p.lastVisit, today) },
    {
      key: 'recall',
      header: 'Next recall',
      cell: (p) => {
        const { text, tone } = recallStatus(p.nextRecall, today);
        return (
          <span
            className={cn(
              tone === 'overdue' || tone === 'today'
                ? 'font-semibold text-amber-800 dark:text-amber-300'
                : 'text-ink',
            )}
          >
            {text}
          </span>
        );
      },
    },
    { key: 'branch', header: 'Branch', cell: (p) => p.branch },
    {
      key: 'balance',
      header: 'Balance',
      className: 'text-right',
      cell: (p) =>
        p.balance > 0 ? (
          <span className="font-semibold text-error tabular-nums">
            {formatPesoShort(p.balance)}
          </span>
        ) : (
          <span aria-label="No balance" className="text-subtle">
            —
          </span>
        ),
    },
  ];
  if (isStaff) {
    columns.push({
      key: 'book',
      header: 'Actions',
      hideHeader: true,
      className: 'w-20 text-right',
      cell: (p) => (
        // shortcut: opens Appointments until the booking form exists (button round 2).
        <Link
          to="/staff/appointments"
          aria-label={`Book a visit for ${p.name}`}
          className={iconOutlineButton}
        >
          <CalendarPlus aria-hidden className="size-[18px]" strokeWidth={1.8} />
        </Link>
      ),
    });
  }
  return columns;
}
