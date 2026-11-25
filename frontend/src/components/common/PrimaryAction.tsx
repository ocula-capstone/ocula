import { Plus } from 'lucide-react';
import { primaryButton } from '@/components/common/buttons';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { cn } from '@/lib/utils';

// The one "create" action of a screen. On desktop it sits where it is placed (the end of the
// list toolbar, right above the data it adds to). On phones it floats at the bottom right,
// within thumb reach; AppShell pads the page so it never covers the last row.
export function PrimaryAction({ label, onClick }: { label: string; onClick?: () => void }) {
  const isDesktop = useIsDesktop();
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        isDesktop
          ? cn(primaryButton, 'ml-auto gap-2')
          : 'fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-navy-900/25 outline-none hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:ring-offset-2'
      }
    >
      <Plus aria-hidden className="size-5" strokeWidth={2} />
      {label}
    </button>
  );
}
