import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A white card with a title, an optional count and an optional link such as "View all".
export function Panel({
  title,
  count,
  action,
  className,
  children,
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('rounded-2xl border border-line bg-white p-4 lg:p-5', className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">
          {title}
          {count !== undefined && <span className="ml-2 font-normal text-subtle">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// A labelled group of rows inside a panel, e.g. "Waiting" or "Checked in".
export function PanelGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="px-2 pb-1 text-[13px] font-semibold text-subtle">{label}</h3>
      <ul>{children}</ul>
    </div>
  );
}

// What a panel shows when it has nothing to list, e.g. "No visits today".
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-2 py-3 text-sm text-subtle">{children}</p>;
}
