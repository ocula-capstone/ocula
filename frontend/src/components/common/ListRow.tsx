import type { ReactNode } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { StatusLabel } from '@/components/common/StatusLabel';
import { statusTone } from '@/components/common/statusTone';
import { cn } from '@/lib/utils';

// One row for every list: who, what, when, its state, and the next step.
//
// Wide screens, left to right: the time with the state written under it (one fixed column, so the
// states line up down the list), the initials, the name and detail, and at the right only the
// action. A row with no action simply has nothing at the right. A row with no time shows its state
// at the right instead.
// Phones: no time column or initials; the state sits at the right of the name, the time is in the
// detail line, and the action drops under, at the right.
export function ListRow({
  name,
  detail,
  meta,
  time,
  status,
  action,
  current,
  avatar = true,
  avatarTone = 'neutral',
}: {
  name: string;
  detail: ReactNode;
  meta?: ReactNode;
  time?: string;
  // Written out with a coloured dot, e.g. "Waiting".
  status?: string;
  action?: ReactNode;
  // The row happening now, e.g. the patient being examined.
  current?: boolean;
  avatar?: boolean;
  // The initials circle: grey, or the light blue of the staff dashboard.
  avatarTone?: 'neutral' | 'brand';
}) {
  // Wide screens place the pieces on a grid whose columns depend on what the row has.
  const columns = [
    time && '6rem',
    avatar && 'auto',
    'minmax(0,1fr)',
    status && !time && 'auto',
    action && 'auto',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <li
      aria-current={current ? 'step' : undefined}
      style={{ '--row-columns': columns } as React.CSSProperties}
      className={cn(
        'relative flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-3 py-3.5 last:border-0 sm:grid sm:grid-cols-[var(--row-columns)] sm:gap-y-1.5',
        current && 'rounded-xl border-transparent bg-brand/5 ring-1 ring-brand/40',
      )}
    >
      {time && (
        <span className="hidden self-end text-sm leading-none font-semibold text-ink tabular-nums sm:block">
          {time}
        </span>
      )}
      {avatar && <Avatar name={name} tone={avatarTone} className="hidden sm:row-span-2 sm:grid" />}
      <div className={cn('min-w-0 flex-1 basis-44 sm:row-span-2')}>
        <p className={cn('truncate text-sm font-semibold text-ink', status && 'max-sm:pr-24')}>
          {name}
        </p>
        <p className="mt-0.5 text-[13px] text-subtle">
          {time && <span className="sm:hidden">{time} · </span>}
          {detail}
        </p>
        {meta && <p className="mt-0.5 text-[13px] text-subtle">{meta}</p>}
      </div>
      {status && (
        // One element, placed twice by CSS: top right of the row on a phone; on a wide screen under
        // the time (when there is one) or in its own column at the right (when there is not).
        <StatusLabel
          tone={statusTone(status)}
          className={cn(
            'absolute top-3.5 right-3 sm:static sm:self-start',
            time ? 'sm:col-start-1 sm:row-start-2' : 'sm:row-span-2 sm:self-center',
          )}
        >
          {status}
        </StatusLabel>
      )}
      {action && <div className="ml-auto flex items-center gap-2 sm:row-span-2">{action}</div>}
    </li>
  );
}
