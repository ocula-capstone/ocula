import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { outlineButton } from '@/components/common/buttons';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/features/auth/auth-context';
import { NeedsAttention } from '@/features/dashboard/components/NeedsAttention';
import { NewMenu } from '@/features/dashboard/components/NewMenu';
import { RecallsToCall } from '@/features/dashboard/components/RecallsToCall';
import { StaffStat } from '@/features/dashboard/components/StaffStat';
import { TodayQueue } from '@/features/dashboard/components/TodayQueue';
import { greetingFor } from '@/features/dashboard/greeting';
import { formatManilaTodayShort } from '@/lib/dates';
import { plural } from '@/lib/format';
import { formatPesoShort, sumCentavos } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  clinicClosesAt,
  jobOrders,
  receipts,
  recalls,
  stock,
  todayQueue,
} from '@/mocks/data/samples';

// The front desk's day, as designed: four numbers that point at the next job, today's queue,
// and what needs attention. Staff see balances owed but no revenue, by decision.
export function StaffDashboard() {
  const { user } = useAuth();

  const done = todayQueue.filter((v) => v.status === 'Done').length;
  const next = todayQueue.find((v) => v.status === 'Booked');
  const recallCount = (status: string) => recalls.filter((r) => r.status === status).length;
  const overdue = recallCount('Overdue');
  const ready = jobOrders.filter((j) => j.stage === 'Ready').length;
  const owed = receipts.filter((r) => r.status !== 'Paid');
  const owedTotal = sumCentavos(owed.map((r) => r.amount)) / 100;
  const oldest = Math.max(0, ...owed.map((r) => r.ageDays));

  return (
    <>
      <PageHeader
        title={greetingFor(user?.fullName ?? '')}
        description={[
          formatManilaTodayShort(),
          clinicClosesAt && `Clinic open until ${clinicClosesAt}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <div className="flex items-center gap-3">
            {/* shortcut: opens the patient list until the walk-in form exists (button round 1). */}
            <Link
              to="/staff/patients"
              className={cn(outlineButton, 'border-line bg-surface lg:min-h-10')}
            >
              Add walk-in
            </Link>
            <NewMenu />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StaffStat
          label="Today's visits"
          value={String(todayQueue.length)}
          inlineNote={`${done} done · ${todayQueue.length - done} left`}
          footer={
            next ? (
              <Link
                to="/staff/appointments"
                className="-my-3.5 inline-block py-3.5 font-medium text-brand-link hover:underline"
              >
                Next: {next.time} · {next.patient}
              </Link>
            ) : (
              <span className="text-subtle">Nothing booked next</span>
            )
          }
        />
        <StaffStat
          warm={overdue > 0}
          label="Overdue recalls"
          value={String(overdue)}
          inlineNote={`+${recallCount('Due today')} due today`}
          footer={
            <Link
              to="/staff/recalls"
              className="-my-3.5 inline-flex items-center gap-1 py-3.5 font-medium text-amber-900 hover:underline dark:text-amber-200"
            >
              {overdue > 0 ? 'Call list ready' : 'Open recalls'}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          }
        />
        <StaffStat
          label="Ready for pickup"
          value={String(ready)}
          inlineNote="job orders"
          footer={
            // shortcut: opens the job orders board, where the Ready column is, until texting exists.
            <Link
              to="/staff/job-orders"
              className="-my-3.5 inline-block py-3.5 font-medium text-brand-link hover:underline"
            >
              Send pickup texts
            </Link>
          }
        />
        <StaffStat
          label="Unpaid balances"
          value={formatPesoShort(owedTotal)}
          footer={
            <span className="text-subtle">
              {plural(owed.length, 'invoice', 'invoices')}
              {owed.length > 0 && ` · oldest ${plural(oldest, 'day', 'days')}`}
            </span>
          }
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <TodayQueue visits={todayQueue} className="xl:col-span-2" />
        <div className="space-y-4">
          <NeedsAttention data={{ jobOrders, stock, receipts }} />
          <RecallsToCall recalls={recalls} />
        </div>
      </div>
    </>
  );
}
