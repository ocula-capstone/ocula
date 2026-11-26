import type { ReactNode } from 'react';

// A filter with its name written above it, in small capitals: "BRANCH" over the field.
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1.5 block text-xs font-semibold tracking-wider text-subtle uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
