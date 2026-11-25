import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FilterTabs } from '@/components/common/FilterTabs';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBox } from '@/components/common/SearchBox';
import { matchesSearch } from '@/lib/search';
import { useAuth } from '@/features/auth/auth-context';
import { patients } from '@/mocks/data/samples';
import type { PatientSummary } from '@/types/clinic';

const columns: Column<PatientSummary>[] = [
  { key: 'name', header: 'Patient', cell: (p) => p.name },
  { key: 'id', header: 'Patient ID', cell: (p) => p.id },
  { key: 'phone', header: 'Phone', cell: (p) => p.phone },
  { key: 'last', header: 'Last visit', cell: (p) => p.last },
  { key: 'branch', header: 'Branch', cell: (p) => p.branch },
];

// Find a patient fast: by name, ID or phone, then narrow by branch.
export function PatientRecordsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('All');
  const rows = patients.filter(
    (p) => (branch === 'All' || p.branch === branch) && matchesSearch(query, p.name, p.id, p.phone),
  );

  return (
    <>
      <PageHeader title="Patient records" description="Everyone registered at MRB Clinic" />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search name, ID or phone" value={query} onChange={setQuery} />
        <FilterTabs
          label="Branch"
          options={['All', 'Pasay', 'Taguig']}
          value={branch}
          onChange={setBranch}
        />
        {user?.role === 'staff' && <PrimaryAction label="New patient" />}
      </div>
      <p role="status" className="text-sm text-subtle">
        {rows.length} {rows.length === 1 ? 'patient' : 'patients'}
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(p) => p.id}
        isLoading={false}
        error={null}
        emptyTitle={patients.length === 0 ? 'No patients yet' : 'No patient matches'}
        emptyDescription={
          patients.length === 0
            ? 'Registered patients appear here.'
            : 'Check the spelling, or register them as a new patient.'
        }
        label="Patients"
      />
    </>
  );
}
