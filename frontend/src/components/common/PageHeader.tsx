import type { ReactNode } from 'react';

// The title and one line of context at the top of a screen, with the screen's main action at the
// right of the title (a "+ New ..." button), on phones too. A grid, not a wrap: the title and the
// button share the first row, and the line of context runs the full width under both, so a long
// line can never push the button down.
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
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 lg:items-start">
      <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[28px]">{title}</h1>
      {actions && <div className="col-start-2 row-start-1 flex justify-end">{actions}</div>}
      {description && <p className="col-span-2 text-sm text-subtle">{description}</p>}
    </header>
  );
}
