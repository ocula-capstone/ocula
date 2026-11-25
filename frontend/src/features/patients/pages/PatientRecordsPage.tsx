import { ArrowUpDown, Funnel } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { DataTable } from '@/components/common/DataTable';
import { OptionMenu } from '@/components/common/OptionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { useAuth } from '@/features/auth/auth-context';
import { LastVisitPicker } from '@/features/patients/components/LastVisitPicker';
import { patientColumns } from '@/features/patients/columns';
import { PAGE_SIZES, usePatientList } from '@/features/patients/usePatientList';
import { manilaToday } from '@/lib/dates';
import { plural } from '@/lib/format';
import { patients } from '@/mocks/data/samples';

const divider = <span aria-hidden className="hidden h-8 w-px bg-line lg:block" />;

// Everyone registered, newest visit first. Narrow by branch, status or last visit; the top-bar
// search opens this page already filtered (?q=). The filtering itself is in usePatientList.
export function PatientRecordsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const today = manilaToday();

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const list = usePatientList(patients, q, today);

  return (
    <>
      <PageHeader
        title="Patient records"
        description={
          patients.length === 0
            ? 'Patients from Pasay and Taguig will appear here'
            : `${plural(patients.length, 'patient')} across Pasay and Taguig`
        }
        actions={isStaff && <PrimaryAction label="New patient" />}
      />

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl border border-line bg-surface p-1.5 lg:flex-nowrap">
        <span className="flex items-center gap-2 px-3 text-sm font-medium text-ink">
          <Funnel aria-hidden className="size-4 text-subtle" />
          Filters
        </span>
        {divider}
        <OptionMenu multi label="Branch" {...list.branch} />
        <OptionMenu multi label="Status" {...list.status} />
        <LastVisitPicker today={today} {...list.visit} />
        {list.filtering && (
          <button
            type="button"
            onClick={list.clearAll}
            className="min-h-11 rounded-lg px-3 text-sm font-medium text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link"
          >
            Clear all
          </button>
        )}
        <OptionMenu
          multi
          label="Sort by"
          align="end"
          className="lg:ml-auto"
          icon={<ArrowUpDown aria-hidden className="size-4 text-subtle" />}
          {...list.sort}
        />
      </div>

      {q && (
        <p className="flex items-center gap-3 text-sm text-subtle">
          {`Results for “${q}”`}
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setParams({}, { replace: true })}
            className="min-h-11 rounded-lg px-2 font-semibold text-brand-link outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-9"
          >
            Clear
          </button>
        </p>
      )}

      <DataTable
        columns={patientColumns(today, isStaff)}
        rows={list.shown}
        getRowId={(p) => p.id}
        isLoading={false}
        error={null}
        rowClassName="h-[60px]"
        footer={
          list.total > 0 && (
            <Pagination
              page={list.page}
              pageCount={list.pageCount}
              pageSize={list.pageSize}
              pageSizes={PAGE_SIZES}
              total={list.total}
              shown={list.shown.length}
              noun="patients"
              onPage={list.setPage}
              onPageSize={list.setPageSize}
            />
          )
        }
        emptyTitle={patients.length === 0 ? 'No patients yet' : 'No patient matches'}
        emptyDescription={
          patients.length === 0
            ? 'Registered patients appear here.'
            : 'Try another filter or search.'
        }
        label="Patients"
      />
    </>
  );
}
