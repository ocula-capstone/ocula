import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A white card with a title, an optional count and an optional link such as "View all".
export function Panel({
  title,
  count,
  note,
  action,
  className,
  children,
}: {
  title: string;
  count?: number;
  // Plain text after the title, e.g. "3 waiting".
  note?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn('rounded-2xl border border-line bg-surface p-4 lg:p-5', className)}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={titleId} className="text-base font-semibold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 font-normal text-subtle">{count}</span>}
          {note && <span className="font-normal text-subtle"> · {note}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// What a panel shows when it has nothing to list, e.g. "No visits today".
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-sm text-subtle">{children}</p>;
}
