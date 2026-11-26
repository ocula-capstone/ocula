import { useState } from 'react';
import { primaryButton } from '@/components/common/buttons';
import { EmptyState } from '@/components/common/EmptyState';
import { EyeReading } from '@/components/common/EyeReading';
import { FilterTabs } from '@/components/common/FilterTabs';
import { PageHeader } from '@/components/common/PageHeader';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { StatusBadge } from '@/components/common/StatusBadge';
import { statusTone } from '@/components/common/statusTone';
import { useBranch } from '@/features/branches/branch-context';
import { cn } from '@/lib/utils';
import { scans } from '@/mocks/data/samples';

const TABS = ['All', 'Needs review', 'Verified'];

// One card per scan. A scan must be checked before it is saved to the patient's record.
export function AutoRefractorPage() {
  const { current } = useBranch();
  const [tab, setTab] = useState('All');
  const shown = scans.filter((scan) => tab === 'All' || scan.status === tab);

  return (
    <>
      <PageHeader
        title="Auto-refractor"
        description={current ? `Today's scans at ${current.name}` : "Today's scans"}
        actions={<PrimaryAction label="New scan" />}
      />
      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs label="Status" options={TABS} value={tab} onChange={setTab} />
      </div>
      {shown.length === 0 && (
        <EmptyState
          title={scans.length === 0 ? 'No scans yet today' : 'No scans in this tab'}
          description={
            scans.length === 0 ? 'Scans appear here once they are taken.' : 'Try another tab.'
          }
        />
      )}
      <ul className="grid gap-4 lg:grid-cols-2">
        {shown.map((scan) => (
          <li key={scan.id} className="rounded-2xl border border-line bg-surface p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">{scan.patient}</h2>
                <p className="text-sm text-subtle">Scanned {scan.time}</p>
              </div>
              <StatusBadge tone={statusTone(scan.status)}>{scan.status}</StatusBadge>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <EyeReading label="Right eye (OD)" reading={scan.od} />
              <EyeReading label="Left eye (OS)" reading={scan.os} />
            </div>
            {scan.status === 'Needs review' && (
              <button type="button" className={cn(primaryButton, 'mt-4 w-full sm:w-auto')}>
                Verify and save<span className="sr-only"> scan for {scan.patient}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
