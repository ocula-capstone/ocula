import { cn } from '@/lib/utils';

// A row of tabs such as All / Pasay / Taguig. Scrolls sideways on narrow phones.
export function FilterTabs({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand-link',
            option === value ? 'bg-navy-900 text-white' : 'text-ink hover:bg-page',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
