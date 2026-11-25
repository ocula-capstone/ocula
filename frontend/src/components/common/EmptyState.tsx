import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

// "Nothing here yet", with an optional next step such as a "Register patient" button.
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-6 py-12 text-center">
      <Inbox aria-hidden className="size-8 text-icon" strokeWidth={1.7} />
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-subtle">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
