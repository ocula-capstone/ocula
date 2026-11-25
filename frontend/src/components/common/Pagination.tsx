import { ChevronLeft, ChevronRight } from 'lucide-react';
import { outlineButton } from '@/components/common/buttons';
import { OptionMenu } from '@/components/common/OptionMenu';
import { pageItems } from '@/lib/pagination';
import { cn } from '@/lib/utils';

const pageButton =
  'inline-flex size-11 items-center justify-center rounded-lg border text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-link lg:size-10';
const stepButton = cn(
  outlineButton,
  'gap-1 border-line px-3 disabled:bg-page disabled:text-subtle lg:min-h-10',
);

// The bar under a long list: rows per page, "Showing 1–50 of 1,248", and numbered pages.
// `page` counts from 0; `shown` is how many rows are on this page.
export function Pagination({
  page,
  pageCount,
  pageSize,
  pageSizes,
  total,
  shown,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizes: number[];
  total: number;
  shown: number;
  // What the rows are, in the plural: "patients".
  noun: string;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const first = page * pageSize;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <OptionMenu
        label="Rows per page"
        side="top"
        summary={`${pageSize} ${noun}`}
        className="border border-line"
        options={pageSizes.map((n) => ({ value: String(n), label: `${n} ${noun}` }))}
        selected={[String(pageSize)]}
        onChange={([n]) => onPageSize(Number(n))}
      />
      <p role="status" className="text-sm text-subtle">
        {`Showing ${first + 1}–${first + shown} of ${total.toLocaleString('en-US')}`}
      </p>
      <nav aria-label="Pages" className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className={stepButton}
        >
          <ChevronLeft aria-hidden className="size-4" />
          Previous
        </button>
        {pageItems(page + 1, pageCount).map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-subtle">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page + 1 ? 'page' : undefined}
              onClick={() => onPage(item - 1)}
              className={cn(
                pageButton,
                item === page + 1
                  ? 'border-navy-900 bg-navy-900 text-white'
                  : 'border-line bg-surface text-ink hover:bg-page',
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className={stepButton}
        >
          Next
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </nav>
    </div>
  );
}
