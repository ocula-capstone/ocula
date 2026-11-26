import type { ReactNode } from 'react';
import type { StatusTone } from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';

// A state written out plainly, with a small dot of its colour: no border, no pill. The word carries
// the meaning and the dot only backs it up, so it still reads without colour. Text colours are dark
// enough to read on white (and light enough on the dark theme).
const DOT: Record<StatusTone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-cyan-600',
  success: 'bg-green-600',
  warning: 'bg-amber-500',
  danger: 'bg-red-600',
};
const TEXT: Record<StatusTone, string> = {
  neutral: 'text-subtle',
  info: 'text-cyan-900 dark:text-cyan-200',
  success: 'text-green-900 dark:text-green-200',
  warning: 'text-amber-900 dark:text-amber-200',
  danger: 'text-red-900 dark:text-red-200',
};

export function StatusLabel({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm leading-none font-medium whitespace-nowrap',
        TEXT[tone],
        className,
      )}
    >
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[tone])} />
      {children}
    </span>
  );
}
