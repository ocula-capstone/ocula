import { Link } from 'react-router';
import { textLink } from '@/components/common/buttons';
import { CallLink } from '@/components/common/CallLink';
import { ListRow } from '@/components/common/ListRow';
import { Panel, PanelEmpty } from '@/components/common/Panel';
import { cn } from '@/lib/utils';
import type { Recall } from '@/types/clinic';

// People to phone today: overdue first, then due today. Later ones stay on the Recalls page.
export function RecallsToCall({ recalls }: { recalls: Recall[] }) {
  // At most five; "View all" opens the rest.
  const toCall = recalls.filter((r) => r.status !== 'Upcoming').slice(0, 5);
  return (
    <Panel
      title="Recalls to call"
      action={
        <Link to="/staff/recalls" className={textLink}>
          View all
        </Link>
      }
    >
      {toCall.length === 0 && <PanelEmpty>No recalls to call</PanelEmpty>}
      <ul>
        {toCall.map((r) => (
          <ListRow
            key={r.id}
            avatar={false}
            name={r.patient}
            detail={
              <span className={cn(r.status === 'Overdue' && 'text-amber-800 dark:text-amber-300')}>
                {`${r.reason} · ${r.due}`}
              </span>
            }
            action={<CallLink icon phone={r.phone} name={r.patient} />}
          />
        ))}
      </ul>
    </Panel>
  );
}
