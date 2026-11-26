import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { cancelVisit } from '@/features/appointments/store';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/clinic';

const REASONS = [
  { label: 'Patient asked', by: 'patient' },
  { label: 'Clinic had to', by: 'clinic' },
  { label: 'Other', by: 'other' },
] as const;

const button =
  'inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

// "Cancel this visit?": pick why (patient asked, clinic had to, other), then one confirm. Mount it
// only for the visit being cancelled, so each opening starts with nothing picked.
export function CancelVisitDialog({ visit, onClose }: { visit: Appointment; onClose: () => void }) {
  const [by, setBy] = useState<(typeof REASONS)[number]['by'] | null>(null);
  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      title="Cancel this visit?"
      description={`${visit.patient}, ${visit.time}. Its time becomes free to book again.`}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Why is it cancelled?</legend>
        {REASONS.map((r) => (
          <label
            key={r.by}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-4 text-sm font-medium text-ink',
              by === r.by ? 'border-brand bg-brand/5' : 'border-line hover:bg-page',
            )}
          >
            <input
              type="radio"
              name="cancel-reason"
              checked={by === r.by}
              onChange={() => setBy(r.by)}
              className="size-4 accent-brand"
            />
            {r.label}
          </label>
        ))}
      </fieldset>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={cn(button, 'border border-slate-300 bg-surface text-ink hover:bg-page')}
        >
          Keep visit
        </button>
        <button
          type="button"
          disabled={!by}
          onClick={() => {
            if (!by) return;
            cancelVisit(visit.id, by);
            onClose();
          }}
          className={cn(
            button,
            'bg-red-700 text-white hover:bg-red-800 disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          Cancel visit
        </button>
      </div>
    </Modal>
  );
}
