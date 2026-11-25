import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Stat {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  // Something is late (e.g. overdue recalls): the number turns red.
  alert?: boolean;
}

// What each figure is, the number, and one line of context. Stacked on phones, three across above.
export function StatGrid({ items }: { items: Stat[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3 lg:gap-4">
      {items.map(({ label, value, note, icon: Icon, alert }) => (
        <div
          key={label}
          className="flex items-start gap-4 rounded-2xl border border-line bg-white p-4 lg:p-5"
        >
          <span
            aria-hidden
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl',
              alert ? 'bg-error/10 text-error' : 'bg-page text-ink',
            )}
          >
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <dt className="text-sm text-subtle">{label}</dt>
            <dd
              className={cn(
                'mt-0.5 text-2xl font-bold tracking-tight tabular-nums',
                alert ? 'text-error' : 'text-ink',
              )}
            >
              {value}
            </dd>
            <dd className="text-[13px] text-subtle">{note}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}
