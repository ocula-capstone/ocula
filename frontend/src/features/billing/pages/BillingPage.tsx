import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FilterTabs } from '@/components/common/FilterTabs';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBox } from '@/components/common/SearchBox';
import { matchesSearch } from '@/lib/search';
import { StatusBadge } from '@/components/common/StatusBadge';
import { statusTone } from '@/components/common/statusTone';
import { formatPeso } from '@/lib/money';
import { receipts } from '@/mocks/data/samples';
import type { Receipt } from '@/types/clinic';

const columns: Column<Receipt>[] = [
  { key: 'patient', header: 'Patient', cell: (r) => r.patient },
  { key: 'id', header: 'Receipt', cell: (r) => r.id },
  { key: 'items', header: 'Items', cell: (r) => r.items },
  {
    key: 'amount',
    header: 'Amount',
    cell: (r) => <span className="tabular-nums">{formatPeso(r.amount)}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>,
  },
];

// Receipts to find and settle. Each receipt shows its amount; there are no day totals here.
export function BillingPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const rows = receipts.filter(
    (r) =>
      (status === 'All' || r.status === status) && matchesSearch(query, r.patient, r.id, r.items),
  );

  return (
    <>
      <PageHeader title="Billing" description="Receipts and balances" />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search patient or receipt" value={query} onChange={setQuery} />
        <FilterTabs
          label="Status"
          options={['All', 'Unpaid', 'Partial', 'Paid']}
          value={status}
          onChange={setStatus}
        />
        <PrimaryAction label="New bill" />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={false}
        error={null}
        emptyTitle={receipts.length === 0 ? 'No receipts yet' : 'No receipts match'}
        label="Receipts"
      />
    </>
  );
}
