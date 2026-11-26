import type { ReactNode } from 'react';

// The title and one line of context at the top of a screen, with the screen's main action at the
// right (a "+ New ..." button; on phones it spans the width under the title).
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
