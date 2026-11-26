import { CircleAlert } from 'lucide-react';
import { ApiError } from '@/api/client';
import { outlineButton } from '@/components/common/buttons';
import { NETWORK_ERROR } from '@/features/auth/form-errors';

// A failed load: the server's message if it sent one, the offline message otherwise.
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-error/40 bg-red-50 p-4 text-red-900 dark:bg-red-400/10 dark:text-red-200"
    >
      <p className="flex items-start gap-2 text-sm font-medium">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {error instanceof ApiError ? error.message : NETWORK_ERROR}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={outlineButton}>
          Try again
        </button>
      )}
    </div>
  );
}
