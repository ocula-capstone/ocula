import { useState } from 'react';
import { DataTable, type Column } from '@/components/common/DataTable';
import { FilterTabs } from '@/components/common/FilterTabs';
import { PrimaryAction } from '@/components/common/PrimaryAction';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBox } from '@/components/common/SearchBox';
import { matchesSearch } from '@/lib/search';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/features/auth/auth-context';
import { useBranch } from '@/features/branches/branch-context';
import { statusTone } from '@/components/common/statusTone';
import { needsRestock, stockLevel } from '@/features/inventory/stock';
import { stock } from '@/mocks/data/samples';
import type { StockItem } from '@/types/clinic';

const columns: Column<StockItem>[] = [
  { key: 'item', header: 'Item', cell: (s) => s.item },
  { key: 'sku', header: 'SKU', cell: (s) => s.sku },
  { key: 'category', header: 'Category', cell: (s) => s.category },
  { key: 'qty', header: 'On hand', cell: (s) => <span className="tabular-nums">{s.qty}</span> },
  {
    key: 'state',
    header: 'Status',
    cell: (s) => {
      const level = stockLevel(s);
      return <StatusBadge tone={statusTone(level)}>{level}</StatusBadge>;
    },
  },
];

const CATEGORIES = ['All', 'Frames', 'Lenses', 'Contact lenses', 'Solutions'];

// What is running out comes first. Doctors can read stock; staff and admin can add items.
export function InventoryPage() {
  const { user } = useAuth();
  const { current } = useBranch();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const restock = needsRestock(stock);
  const rows = stock.filter(
    (s) => (category === 'All' || s.category === category) && matchesSearch(query, s.item, s.sku),
  );
  const canEdit = user?.role === 'staff' || user?.role === 'admin';

  return (
    <>
      <PageHeader title="Inventory" description={current ? `Stock at ${current.name}` : 'Stock'} />
      {restock.length > 0 && (
        <section
          aria-labelledby="restock"
          className="rounded-2xl border border-line bg-surface p-4 lg:p-5"
        >
          <h2 id="restock" className="text-base font-semibold text-ink">
            {restock.length} items need restocking
          </h2>
          <p className="mt-1 text-sm text-subtle">{restock.map((s) => s.item).join(' · ')}</p>
        </section>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search item or SKU" value={query} onChange={setQuery} />
        <FilterTabs label="Category" options={CATEGORIES} value={category} onChange={setCategory} />
        {canEdit && <PrimaryAction label="Add item" />}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => s.sku}
        isLoading={false}
        error={null}
        emptyTitle={stock.length === 0 ? 'No items yet' : 'No items match'}
        label="Inventory"
      />
    </>
  );
}
