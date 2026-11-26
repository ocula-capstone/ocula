import { Plus } from 'lucide-react';
import { actionButton } from '@/components/common/buttons';
import { cn } from '@/lib/utils';

// The one "create" action of a screen. It goes in PageHeader's `actions`: at the right of the page
// title on every screen size, so the eye finds it first and it costs no height on a phone. It
// never floats: a button over the content hides the last rows and the patient bottom bar. It is
// 44px tall (a comfortable tap) and as wide as its label. If a very narrow phone cannot fit it
// beside the title it drops under the title, still at the right.
export function PrimaryAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(actionButton, 'ml-auto gap-2 px-4')}>
      <Plus aria-hidden className="size-5" strokeWidth={2} />
      {label}
    </button>
  );
}
