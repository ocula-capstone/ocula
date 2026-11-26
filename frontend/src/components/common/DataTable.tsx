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
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  // The column has no visible title (e.g. a row's action button): screen readers still get it,
  // and a phone card shows the cell without a label.
  hideHeader?: boolean;
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
  // Classes for each body row, e.g. a taller row for two-line cells (default 40px).
  rowClassName?: string;
  // Shown under the rows inside the same card, e.g. "Showing 1–8 of 37" and page buttons.
  footer?: ReactNode;
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
  rowClassName,
  footer,
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
      <>
        <ul aria-busy={isLoading} aria-label={label} className="space-y-3">
          {isLoading
            ? Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="space-y-2 rounded-xl border border-line bg-surface p-4">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </li>
              ))
            : rows?.map((row) => (
                <li key={getRowId(row)} className="rounded-xl border border-line bg-surface p-4">
                  <div className="text-sm font-semibold text-ink">{title?.cell(row)}</div>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    {details.map((column) =>
                      column.hideHeader ? (
                        <div key={column.key} className="flex justify-end pt-1">
                          {column.cell(row)}
                        </div>
                      ) : (
                        <div key={column.key} className="flex items-center justify-between gap-3">
                          <dt className="text-subtle">{column.header}</dt>
                          <dd className="text-right text-ink">{column.cell(row)}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </li>
              ))}
        </ul>
        {footer && <div className="mt-3 rounded-2xl border border-line bg-surface">{footer}</div>}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Table aria-busy={isLoading} aria-label={label}>
        <TableHeader>
          <TableRow className="bg-page/60 hover:bg-page/60">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  'h-11 text-xs font-semibold tracking-wider text-subtle uppercase',
                  column.className,
                )}
              >
                {column.hideHeader ? (
                  <span className="sr-only">{column.header}</span>
                ) : (
                  column.header
                )}
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
                <TableRow key={getRowId(row)} className={cn('h-10', rowClassName)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {footer && <div className="border-t border-line">{footer}</div>}
    </div>
  );
}
