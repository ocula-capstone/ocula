import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FilterField } from '@/components/common/FilterField';
import { FilterTabs } from '@/components/common/FilterTabs';
import { OptionMenu } from '@/components/common/OptionMenu';
import { PageHeader } from '@/components/common/PageHeader';
import { Pagination } from '@/components/common/Pagination';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { useAuth } from '@/features/auth/auth-context';
import { PatientCards } from '@/features/patients/components/PatientCards';
import { LastVisitPicker } from '@/features/patients/components/LastVisitPicker';
import { patientColumns } from '@/features/patients/columns';
import { PAGE_SIZES, usePatientList } from '@/features/patients/usePatientList';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { manilaToday } from '@/lib/dates';
import { plural } from '@/lib/format';
import { patients } from '@/mocks/data/samples';

const VIEWS = ['Table', 'Cards'];

// Everyone registered, newest visit first. One card holds the search (name, ID or phone), the four
// filters and the count; the list below it is a table or cards. A link with ?q= opens it already
// searched. The filtering itself is in usePatientList. Phones always get cards.
export function PatientRecordsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const today = manilaToday();
  const isWide = useMediaQuery('(min-width: 768px)');
  const [view, setView] = useState('Table');
  const asCards = !isWide || view === 'Cards';

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  // The box keeps its own text, so typing never waits on the address; the address follows it.
  const [text, setText] = useState(q);
  const [seen, setSeen] = useState(q);
  if (q !== seen) {
    // The address changed from outside (a link, Clear all): show it.
    setSeen(q);
    setText(q);
  }
  const search = (value: string) => {
    setText(value);
    setParams(value ? { q: value } : {}, { replace: true });
  };
  const list = usePatientList(patients, q, today);
  const filtering = list.filtering || q !== '';

  const footer = list.total > 0 && (
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
  );
  const emptyTitle = patients.length === 0 ? 'No patients yet' : 'No patient matches';
  const emptyDescription =
    patients.length === 0 ? 'Registered patients appear here.' : 'Try another filter or search.';

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

      <section
        data-filter-bar
        aria-label="Find patients"
        className="rounded-2xl border border-line bg-surface p-4 lg:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-icon"
            />
            <input
              type="search"
              aria-label="Search patients"
              placeholder="Search by name, ID or phone…"
              value={text}
              onChange={(e) => search(e.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-page pr-12 pl-11 text-base text-ink outline-none placeholder:text-placeholder focus-visible:border-brand-link focus-visible:ring-2 focus-visible:ring-brand-link [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => search('')}
                className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-subtle outline-none hover:bg-line/60 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-link"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </div>
          {isWide && <FilterTabs label="View" options={VIEWS} value={view} onChange={setView} />}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-4">
          <FilterField label="Branch">
            <OptionMenu field multi label="Branch" {...list.branch} />
          </FilterField>
          <FilterField label="Status">
            <OptionMenu field multi label="Status" {...list.status} />
          </FilterField>
          <FilterField label="Last visit">
            <LastVisitPicker field today={today} {...list.visit} />
          </FilterField>
          <FilterField label="Sort by">
            <OptionMenu field multi label="Sort by" align="end" {...list.sort} />
          </FilterField>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-[13px] text-subtle">
            {'Showing '}
            <b className="font-semibold text-ink">{list.total}</b>
            {` of ${plural(patients.length, 'patient')}`}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                list.clearAll();
                search('');
              }}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-brand-link underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-9"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {asCards ? (
        list.shown.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <PatientCards patients={list.shown} today={today} isStaff={isStaff} />
            {footer && <div className="rounded-2xl border border-line bg-surface">{footer}</div>}
          </>
        )
      ) : (
        <DataTable
          columns={patientColumns(today, isStaff)}
          rows={list.shown}
          getRowId={(p) => p.id}
          isLoading={false}
          error={null}
          rowClassName="h-[60px]"
          footer={footer}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          label="Patients"
        />
      )}
    </>
  );
}
