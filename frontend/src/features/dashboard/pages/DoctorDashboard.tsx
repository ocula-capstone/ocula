import { Activity, Eye, Users } from 'lucide-react';
import { Link } from 'react-router';
import { textLink } from '@/components/common/buttons';
import { ListRow } from '@/components/common/ListRow';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelEmpty } from '@/components/common/Panel';
import { StatGrid } from '@/components/common/StatGrid';
import { useAuth } from '@/features/auth/auth-context';
import { greetingFor } from '@/features/dashboard/greeting';
import { useTodayLine } from '@/hooks/useTodayLine';
import {
  doctorSchedule,
  examinationsThisWeek,
  patients,
  recentPatients,
} from '@/mocks/data/samples';

// The optometrist's day: the schedule, with the patient being seen now outlined.
export function DoctorDashboard() {
  const { user } = useAuth();
  const todayLine = useTodayLine();
  const done = doctorSchedule.filter((v) => v.status === 'Done').length;

  return (
    <>
      <PageHeader title={greetingFor(user?.fullName ?? '')} description={todayLine} />
      <StatGrid
        items={[
          {
            label: "Today's patients",
            value: String(doctorSchedule.length),
            note: `${done} completed`,
            icon: Users,
          },
          {
            label: 'Examinations',
            value: String(examinationsThisWeek),
            note: 'This week',
            icon: Eye,
          },
          {
            label: 'Total records',
            value: String(patients.length),
            note: 'Across both branches',
            icon: Activity,
          },
        ]}
      />
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Panel
          title="Schedule"
          count={doctorSchedule.length}
          action={
            <Link to="/doctor/patients" className={textLink}>
              All patients
            </Link>
          }
          className="lg:col-span-3"
        >
          {doctorSchedule.length === 0 && <PanelEmpty>No visits scheduled today</PanelEmpty>}
          <ol>
            {doctorSchedule.map((v) => (
              <ListRow
                key={v.id}
                name={v.patient}
                detail={v.service}
                time={v.time}
                status={v.status}
                current={v.status === 'In progress'}
              />
            ))}
          </ol>
        </Panel>
        <Panel
          title="Recent patients"
          action={
            <Link to="/doctor/patients" className={textLink}>
              View all
            </Link>
          }
          className="lg:col-span-2"
        >
          {recentPatients.length === 0 && <PanelEmpty>No patients yet</PanelEmpty>}
          <ul>
            {recentPatients.map((p) => (
              <ListRow key={p.id} name={p.name} detail={`${p.id} · last visit ${p.last}`} />
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
