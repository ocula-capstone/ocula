import { Search } from 'lucide-react';

// A search field with a magnifier. The label is read by screen readers and shown as the hint.
export function SearchBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-icon"
        strokeWidth={1.7}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="min-h-11 w-full rounded-xl border border-field-border bg-white pr-3 pl-10 text-base text-ink outline-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand-link"
      />
    </label>
  );
}
