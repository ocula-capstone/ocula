import { Fragment, useRef } from 'react';
import { useSlideTo } from '@/hooks/useSlideTo';
import { cn } from '@/lib/utils';

// A row of tabs such as All / Pasay / Taguig. Scrolls sideways on narrow phones.
export function FilterTabs({
  label,
  options,
  value,
  onChange,
  soft,
  fill,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  // The small grey toggle (Upcoming / All) instead of the white tab bar with a navy selection.
  soft?: boolean;
  // On phones the tabs share the full width equally; from laptop width they fit their text.
  fill?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const slide = useSlideTo(ref, '[aria-pressed="true"]', [value, options.join()]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn(
        'relative flex max-w-full gap-1 overflow-x-auto p-1',
        soft ? 'rounded-lg bg-page p-0.5' : 'rounded-xl border border-line bg-surface',
        fill && 'w-full lg:w-auto',
      )}
    >
      {/* The selection: one highlight that slides to whichever tab is picked. */}
      {!soft && (
        <span
          aria-hidden
          style={slide.style}
          className={cn(
            'pointer-events-none absolute top-0 left-0 rounded-lg bg-brand',
            slide.animate &&
              'transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
          )}
        />
      )}
      {options.map((option, i) => (
        <Fragment key={option}>
          <button
            type="button"
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className={cn(
              'shrink-0 rounded-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-link',
              fill && 'flex-1 lg:flex-none',
              soft
                ? 'min-h-11 min-w-11 px-3 text-[13px] lg:min-h-8 lg:min-w-0'
                : 'relative z-10 min-h-11 px-4 text-sm transition-colors duration-200',
              option === value
                ? soft
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-white'
                : soft
                  ? 'text-subtle hover:text-ink'
                  : 'text-ink hover:text-brand-text',
            )}
          >
            {option}
          </button>
          {/* A thin line between tabs; it fades while either neighbour is the selected one. */}
          {!soft && i < options.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'my-auto h-5 w-px shrink-0 bg-line transition-opacity duration-200',
                (option === value || options[i + 1] === value) && 'opacity-0',
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
