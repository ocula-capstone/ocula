import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// collapse: from 1280px (two-up fields) show only the eye icon; the aria-label keeps the full name.
export function ShowToggle({
  shown,
  label,
  onToggle,
  collapse,
}: {
  shown: boolean;
  label: string;
  onToggle: () => void;
  collapse?: boolean;
}) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${shown ? 'Hide' : 'Show'} ${label}`}
      className={cn(
        'flex min-h-8 shrink-0 items-center gap-1.5 rounded-md px-1 text-[13px] font-medium text-subtle transition-colors hover:text-brand-link focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:outline-none',
        collapse && 'xl:-mr-1.5 xl:size-8 xl:justify-center',
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
      <span className={cn(collapse && 'xl:hidden')}>{shown ? 'Hide' : 'Show'}</span>
    </button>
  );
}
