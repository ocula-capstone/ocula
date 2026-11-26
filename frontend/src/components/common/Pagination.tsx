import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FilterField } from '@/components/common/FilterField';
import { OptionMenu } from '@/components/common/OptionMenu';
import { pageItems } from '@/lib/pagination';
import { cn } from '@/lib/utils';

// Built like the filters above a list: soft grey fields and buttons, 48px tall, the name written
// above the field, the current page in navy like the Table / Cards control.
const soft =
  'inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-page text-sm font-semibold text-ink outline-none hover:bg-line/60 focus-visible:ring-2 focus-visible:ring-brand-link disabled:pointer-events-none disabled:text-subtle disabled:opacity-60';

// The bar under a long list: rows per page, "Showing 1–50 of 1,248", and the pages. It has its own
// padding, so it looks the same inside a table's card or a card of its own. On a phone the numbers
// give way to "Page 2 of 5" between Previous and Next. `page` counts from 0; `shown` is how many
// rows are on this page.
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
    <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between lg:p-5">
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <div className="w-44">
          <FilterField label="Rows per page">
            <OptionMenu
              field
              label="Rows per page"
              side="top"
              summary={`${pageSize} ${noun}`}
              options={pageSizes.map((n) => ({ value: String(n), label: `${n} ${noun}` }))}
              selected={[String(pageSize)]}
              onChange={([n]) => onPageSize(Number(n))}
            />
          </FilterField>
        </div>
        <p role="status" className="pb-3.5 text-[13px] text-subtle">
          {`Showing ${first + 1}–${first + shown} of ${total.toLocaleString('en-US')}`}
        </p>
      </div>
      <nav aria-label="Pages" className="flex items-center gap-2 max-sm:justify-between">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className={cn(soft, 'px-3 min-[360px]:px-4')}
        >
          <ChevronLeft aria-hidden className="size-4" />
          Previous
        </button>
        <span className="text-sm font-medium whitespace-nowrap text-subtle sm:hidden">
          {`Page ${page + 1} of ${pageCount}`}
        </span>
        {pageItems(page + 1, pageCount).map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} aria-hidden className="px-1 text-subtle max-sm:hidden">
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
                soft,
                'size-12 max-sm:hidden',
                item === page + 1 && 'bg-brand text-white hover:bg-brand',
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
          className={cn(soft, 'px-3 min-[360px]:px-4')}
        >
          Next
          <ChevronRight aria-hidden className="size-4" />
        </button>
      </nav>
    </div>
  );
}
