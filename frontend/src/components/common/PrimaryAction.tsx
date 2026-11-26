import { Plus } from 'lucide-react';
import { primaryButton } from '@/components/common/buttons';
import { cn } from '@/lib/utils';

// The one "create" action of a screen, in the page where the eye looks first: at the right of the
// page title (or the end of the list toolbar) from tablet width up, and across the full width of
// the page, edge to edge with the page padding, on phones. It does not float: a button over the
// content hides the last rows and, on the patient screens, the bottom bar.
export function PrimaryAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(primaryButton, 'w-full gap-2 sm:ml-auto sm:w-auto')}
    >
      <Plus aria-hidden className="size-5" strokeWidth={2} />
      {label}
    </button>
  );
}
