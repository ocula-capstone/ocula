import { cn } from '@/lib/utils';

// A row of tabs such as All / Pasay / Taguig. Scrolls sideways on narrow phones.
export function FilterTabs({
  label,
  options,
  value,
  onChange,
  soft,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  // The small grey toggle (Upcoming / All) instead of the white tab bar with a navy selection.
  soft?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex max-w-full gap-1 overflow-x-auto p-1',
        soft ? 'rounded-lg bg-page p-0.5' : 'rounded-xl border border-line bg-surface',
      )}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'shrink-0 rounded-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-link',
            soft
              ? 'min-h-11 min-w-11 px-3 text-[13px] lg:min-h-8 lg:min-w-0'
              : 'min-h-11 px-4 text-sm',
            option === value
              ? soft
                ? 'bg-surface text-ink shadow-sm'
                : 'bg-navy-900 text-white'
              : soft
                ? 'text-subtle hover:text-ink'
                : 'text-ink hover:bg-page',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
