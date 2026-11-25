import type { ReactNode } from 'react';

// The title and one line of context at the top of a screen. Actions live with the data they
// act on (the list toolbar), not up here.
export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink lg:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
      </div>
    </header>
  );
}
