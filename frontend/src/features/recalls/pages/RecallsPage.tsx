import { useState } from 'react';
import { CallLink } from '@/components/common/CallLink';
import { ListRow } from '@/components/common/ListRow';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { SearchBox } from '@/components/common/SearchBox';
import { matchesSearch } from '@/lib/search';
import { recalls } from '@/mocks/data/samples';
import type { RecallStatus } from '@/types/clinic';

const groups: RecallStatus[] = ['Overdue', 'Due today', 'Upcoming'];

// Patients to call back, most urgent first. "Call" dials the number on a phone.
export function RecallsPage() {
  const [query, setQuery] = useState('');
  return (
    <>
      <PageHeader title="Recalls & follow-up" description="Patients to call back" />
      <SearchBox label="Search patient or reason" value={query} onChange={setQuery} />
      {groups.map((group) => {
        const rows = recalls.filter(
          (r) => r.status === group && matchesSearch(query, r.patient, r.reason),
        );
        return (
          <Panel key={group} title={group} count={rows.length}>
            {rows.length === 0 ? (
              <p className="px-2 py-3 text-sm text-subtle">No one in this group.</p>
            ) : (
              <ul>
                {rows.map((r) => (
                  <ListRow
                    key={r.id}
                    name={r.patient}
                    detail={r.reason}
                    meta={r.due}
                    action={<CallLink phone={r.phone} name={r.patient} />}
                  />
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
    </>
  );
}
