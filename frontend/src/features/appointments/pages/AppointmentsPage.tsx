import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterTabs } from '@/components/common/FilterTabs';
import { ListRow } from '@/components/common/ListRow';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { SearchBox } from '@/components/common/SearchBox';
import { matchesSearch } from '@/lib/search';
import { useBranch } from '@/features/branches/branch-context';
import { agenda } from '@/mocks/data/samples';

// An agenda, one card per day, because the desk thinks in "today" and "next".
export function AppointmentsPage() {
  const { current } = useBranch();
  const [query, setQuery] = useState('');
  const [when, setWhen] = useState('All');
  const days = agenda
    .filter((d) => when === 'All' || (when === 'Today') === d.today)
    .map((d) => ({ ...d, items: d.items.filter((a) => matchesSearch(query, a.patient, a.detail)) }))
    .filter((d) => d.items.length > 0);

  return (
    <>
      <PageHeader
        title="Appointments"
        description={current ? `Booked visits at ${current.name}` : 'Booked visits'}
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search patient or service" value={query} onChange={setQuery} />
        <FilterTabs
          label="When"
          options={['All', 'Today', 'Upcoming']}
          value={when}
          onChange={setWhen}
        />
        <PrimaryAction label="Book a visit" />
      </div>
      {days.length === 0 && (
        <EmptyState title="No appointments match" description="Try another name or day." />
      )}
      {days.map((d) => (
        <Panel key={d.day} title={d.day} count={d.items.length}>
          <ul>
            {d.items.map((a) => (
              <ListRow
                key={a.id}
                name={a.patient}
                detail={a.detail}
                time={a.time}
                status={a.status}
              />
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
}
