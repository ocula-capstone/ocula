import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { statusTone } from '@/components/common/statusTone';
import { initials } from '@/lib/initials';
import { cn } from '@/lib/utils';

// One row for every list: who, what, when, its state, and the next step.
// On phones the time moves under the name and the initials are hidden to save width.
export function ListRow({
  name,
  detail,
  meta,
  time,
  status,
  action,
  current,
  avatar = true,
}: {
  name: string;
  detail: string;
  meta?: ReactNode;
  time?: string;
  // Shown as a coloured badge, e.g. "Waiting".
  status?: string;
  action?: ReactNode;
  // The row happening now, e.g. the patient being examined.
  current?: boolean;
  avatar?: boolean;
}) {
  return (
    <li
      aria-current={current ? 'step' : undefined}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-2 py-2.5 last:border-0',
        current && 'rounded-xl border-transparent bg-brand/5 ring-1 ring-brand/40',
      )}
    >
      {time && (
        <span className="hidden w-[4.5rem] shrink-0 text-[13px] font-semibold text-ink tabular-nums sm:block">
          {time}
        </span>
      )}
      {avatar && (
        <span
          aria-hidden
          className="hidden size-9 shrink-0 place-items-center rounded-full bg-page text-[13px] font-semibold text-ink sm:grid"
        >
          {initials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1 basis-44">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="text-[13px] text-subtle">
          {time && <span className="sm:hidden">{time} · </span>}
          {detail}
        </p>
        {meta && <p className="text-[13px] text-subtle">{meta}</p>}
      </div>
      {(status || action) && (
        <div className="ml-auto flex items-center gap-2">
          {status && <StatusBadge tone={statusTone(status)}>{status}</StatusBadge>}
          {action}
        </div>
      )}
    </li>
  );
}
