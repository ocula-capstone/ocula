import { Search } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

// The top-bar search. Enter opens the list at `to` already filtered by what was typed
// (to?q=...); Cmd+K / Ctrl+K focuses it from anywhere on the page.
export function GlobalSearch({
  to,
  placeholder = 'Search patients',
  showShortcut,
}: {
  to: string;
  placeholder?: string;
  // The "⌘K" hint, shown on desktop only.
  showShortcut?: boolean;
}) {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.current?.value.trim() ?? '';
    navigate(text ? `${to}?q=${encodeURIComponent(text)}` : to);
    if (input.current) input.current.value = '';
    input.current?.blur();
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative min-w-0 flex-1">
      <label>
        <span className="sr-only">Search patients by name, phone or ID</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-icon"
          strokeWidth={1.7}
        />
        <input
          ref={input}
          type="search"
          placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border-0 bg-page pr-3 pl-10 text-sm text-ink outline-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand-link lg:min-h-10 lg:pr-16"
        />
      </label>
      {showShortcut && (
        <kbd
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 py-0.5 font-sans text-xs text-subtle"
        >
          {isMac() ? '⌘K' : 'Ctrl K'}
        </kbd>
      )}
    </form>
  );
}
