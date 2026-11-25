import type { ReactNode } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowId: (row: T) => string;
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  // The table's name for screen readers, e.g. "Patients".
  label?: string;
}

const SKELETON_ROWS = 5;

// One list for every screen: skeleton while loading, error with retry, empty state, or rows.
// Rows are a table from tablet width up, and cards on a phone.
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  label,
}: DataTableProps<T>) {
  const isWide = useMediaQuery('(min-width: 768px)');

  // A failed refresh must not hide rows that are already on screen.
  if (error && !rows?.length) return <ErrorState error={error} onRetry={onRetry} />;
  if (!isLoading && rows?.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (!isWide) {
    // The first column is the card's title; the others are small "label, value" lines.
    const [title, ...details] = columns;
    return (
      <ul aria-busy={isLoading} aria-label={label} className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="space-y-2 rounded-xl border border-line bg-white p-4">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </li>
            ))
          : rows?.map((row) => (
              <li key={getRowId(row)} className="rounded-xl border border-line bg-white p-4">
                <div className="text-sm font-semibold text-ink">{title?.cell(row)}</div>
                <dl className="mt-2 space-y-1.5 text-sm">
                  {details.map((column) => (
                    <div key={column.key} className="flex items-center justify-between gap-3">
                      <dt className="text-subtle">{column.header}</dt>
                      <dd className="text-right text-ink">{column.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <Table aria-busy={isLoading} aria-label={label}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <TableRow key={i} className="h-10">
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows?.map((row) => (
                <TableRow key={getRowId(row)} className="h-10">
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
