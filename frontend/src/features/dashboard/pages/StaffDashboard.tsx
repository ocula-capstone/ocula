import { CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { Link } from 'react-router';
import { outlineButton, textLink } from '@/components/common/buttons';
import { CallLink } from '@/components/common/CallLink';
import { ListRow } from '@/components/common/ListRow';
import { PageHeader } from '@/components/common/PageHeader';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { Panel, PanelEmpty, PanelGroup } from '@/components/common/Panel';
import { StatGrid } from '@/components/common/StatGrid';
import { useAuth } from '@/features/auth/auth-context';
import { greetingFor } from '@/features/dashboard/greeting';
import { useTodayLine } from '@/hooks/useTodayLine';
import { recalls, todayQueue } from '@/mocks/data/samples';
import type { RecallStatus, VisitStatus } from '@/types/clinic';

// The order the desk deals with people: who is here and waiting, who is due, who is done.
const QUEUE_GROUPS: VisitStatus[] = ['Waiting', 'Not arrived', 'Checked in'];

// The front desk's day: who is waiting, who has not arrived, and who needs a call back.
// No money here by decision: staff do not see revenue.
export function StaffDashboard() {
  const { user } = useAuth();
  const todayLine = useTodayLine();
  const visitsWith = (status: VisitStatus) => todayQueue.filter((v) => v.status === status);
  const recallCount = (status: RecallStatus) => recalls.filter((r) => r.status === status).length;
  const toCall = recalls.filter((r) => r.status !== 'Upcoming');
  const overdue = recallCount('Overdue');

  return (
    <>
      <PageHeader title={greetingFor(user?.fullName ?? '')} description={todayLine} />
      <StatGrid
        items={[
          {
            label: "Today's visits",
            value: String(todayQueue.length),
            note: `${visitsWith('Not arrived').length} not arrived yet`,
            icon: Users,
          },
          {
            label: 'Overdue recalls',
            value: String(overdue),
            note: `${recallCount('Due today')} more due today`,
            icon: ClipboardCheck,
            alert: overdue > 0,
          },
          {
            label: 'Upcoming recalls',
            value: String(recallCount('Upcoming')),
            note: 'Next 7 days',
            icon: CalendarDays,
          },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Panel
          title="Today's queue"
          count={todayQueue.length}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/staff/appointments" className={textLink}>
                All appointments
              </Link>
              {/* Walk-ins join the queue here; on phones this floats at the bottom right. */}
              <PrimaryAction label="New patient" />
            </div>
          }
          className="lg:col-span-3"
        >
          {todayQueue.length === 0 && <PanelEmpty>No visits today</PanelEmpty>}
          {QUEUE_GROUPS.map((status) => {
            const visits = visitsWith(status);
            if (visits.length === 0) return null;
            return (
              <PanelGroup key={status} label={status}>
                {visits.map((v) => (
                  <ListRow
                    key={v.id}
                    name={v.patient}
                    detail={v.service}
                    time={v.time}
                    action={
                      status === 'Not arrived' && (
                        <button type="button" className={outlineButton}>
                          Check in<span className="sr-only"> {v.patient}</span>
                        </button>
                      )
                    }
                  />
                ))}
              </PanelGroup>
            );
          })}
        </Panel>
        <Panel
          title="Recalls to call"
          count={toCall.length}
          action={
            <Link to="/staff/recalls" className={textLink}>
              View all
            </Link>
          }
          className="lg:col-span-2"
        >
          {toCall.length === 0 && <PanelEmpty>No recalls to call</PanelEmpty>}
          <ul>
            {toCall.map((r) => (
              <ListRow
                key={r.id}
                name={r.patient}
                detail={r.reason}
                meta={
                  r.status === 'Overdue' ? (
                    <>
                      <span className="font-semibold text-error">Overdue</span> · {r.due}
                    </>
                  ) : (
                    <span className="font-semibold text-ink">{r.due}</span>
                  )
                }
                action={<CallLink phone={r.phone} name={r.patient} />}
              />
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
