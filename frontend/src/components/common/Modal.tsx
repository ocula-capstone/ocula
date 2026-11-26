import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// A padded box in the middle of the screen over a dimmed page. Focus stays inside it; Escape, the
// close button or a click outside close it. For a task that needs the desk's full attention.
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  className,
  flush,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  // No padding around the content: the caller lays out its own sections edge to edge under a
  // ruled header.
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-navy-900/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup
          className={cn(
            'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-surface shadow-xl outline-none transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none',
            !flush && 'p-5 lg:p-6',
            className,
          )}
        >
          <div
            className={cn(
              'flex items-start justify-between gap-4',
              flush ? 'border-b border-line px-6 py-5' : 'mb-4',
            )}
          >
            <div>
              <Dialog.Title className="text-lg font-bold text-ink">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-subtle">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-lg text-subtle outline-none hover:bg-page hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-link lg:size-9',
                !flush && '-mt-1 -mr-2',
              )}
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
