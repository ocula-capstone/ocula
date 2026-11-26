import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// One of the four cards on the staff dashboard: a label, a big number with a small note beside
// it, and a line underneath (usually a link to the screen that deals with it).
// `warm` is the amber card, used while something is overdue.
export function StaffStat({
  label,
  value,
  inlineNote,
  footer,
  warm,
}: {
  label: string;
  value: string;
  // Small text beside the number, e.g. "5 done · 3 left".
  inlineNote?: string;
  footer?: ReactNode;
  warm?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'rounded-2xl border p-3.5 lg:p-5',
        warm
          ? 'border-gold/50 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-400/10'
          : 'border-line bg-surface',
      )}
    >
      <p
        className={cn(
          'text-[13px] font-medium',
          warm ? 'text-amber-900 dark:text-amber-200' : 'text-subtle',
        )}
      >
        {label}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="text-3xl leading-none font-bold tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {inlineNote && (
          <span
            className={cn(
              'text-[13px]',
              warm ? 'text-amber-900 dark:text-amber-200' : 'text-subtle',
            )}
          >
            {inlineNote}
          </span>
        )}
      </p>
      {footer && <div className="mt-3 text-[13px]">{footer}</div>}
    </div>
  );
}
