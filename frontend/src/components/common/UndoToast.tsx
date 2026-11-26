import { useSyncExternalStore } from 'react';
import { textLink } from '@/components/common/buttons';
import { currentToast, dismissUndo, subscribe } from '@/lib/undoToast';

// Shows the current Undo message (see lib/undoToast.ts); AppShell mounts it once.
export function UndoToastHost() {
  const toast = useSyncExternalStore(subscribe, currentToast, () => null);
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-60 flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-navy-900 py-1 pr-2 pl-4 text-sm text-white shadow-lg lg:bottom-6"
    >
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            dismissUndo();
          }}
          className={`${textLink} px-2 text-white! underline`}
        >
          Undo
        </button>
      )}
    </div>
  );
}
