import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { rowAction, rowActionSolid, textLink } from '@/components/common/buttons';
import { FilterTabs } from '@/components/common/FilterTabs';
import { ListRow } from '@/components/common/ListRow';
import { Panel, PanelEmpty } from '@/components/common/Panel';
import { recordsLink } from '@/features/patients/links';
import { cn } from '@/lib/utils';
import type { Visit, VisitStatus } from '@/types/clinic';

// What the desk does next for each person: finish what was started, start who is here, or
// check in who is booked. Finished visits have nothing left to do.
const NEXT_STEP: Partial<Record<VisitStatus, { label: string; primary?: boolean }>> = {
  'In exam': { label: 'Open records' },
  Waiting: { label: 'Start exam', primary: true },
  Booked: { label: 'Check in' },
};

// The button for a visit's next step, always in the same place and the same size. "Open records"
// is a link to the patient's record; the others take `onClick` (the dashboard passes none yet).
// A visit with nothing left to do leaves an empty place, so the rows above and below keep their
// columns.
export function NextStepButton({
  status,
  patient,
  onClick,
}: {
  status: VisitStatus;
  patient: string;
  onClick?: () => void;
}) {
  const next = NEXT_STEP[status];
  if (!next) return null;
  const className = next.primary ? rowActionSolid : rowAction;
  const label = (
    <>
      {next.label} <span className="sr-only">for {patient}</span>
    </>
  );
  return status === 'In exam' ? (
    <Link to={recordsLink(patient)} className={className}>
      {label}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}

// Today's visits in time order. "Upcoming" hides the finished ones; "All" shows the whole day.
export function TodayQueue({ visits, className }: { visits: Visit[]; className?: string }) {
  const [tab, setTab] = useState('Upcoming');
  const waiting = visits.filter((v) => v.status === 'Waiting').length;
  const shown = visits.filter((v) => tab === 'All' || v.status !== 'Done');

  return (
    <Panel
      title="Today's queue"
      note={`${waiting} waiting`}
      className={className}
      action={
        <FilterTabs soft label="Show" options={['Upcoming', 'All']} value={tab} onChange={setTab} />
      }
    >
      {shown.length === 0 && (
        <PanelEmpty>{visits.length === 0 ? 'No visits today' : 'No more visits today'}</PanelEmpty>
      )}
      <ul>
        {shown.map((v) => (
          <ListRow
            key={v.id}
            name={v.patient}
            detail={v.service}
            time={v.time}
            status={v.status}
            avatarTone="brand"
            action={<NextStepButton status={v.status} patient={v.patient} />}
          />
        ))}
      </ul>
      <Link to="/staff/appointments" className={cn(textLink, 'mt-2 gap-1.5 px-2')}>
        View all appointments
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </Panel>
  );
}
