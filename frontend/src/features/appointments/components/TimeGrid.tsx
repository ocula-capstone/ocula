import { findConflict } from '@/features/appointments/store';
import { slotTimes } from '@/features/appointments/slots';
import { from24, minutesOf, to24 } from '@/features/appointments/days';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/clinic';

// The chosen day's half-hour times, three to a row. Free times are plain and one tap; the picked
// one is solid blue; a taken one is muted and crossed out (not colour alone), with who has it in
// its tooltip and screen-reader label. `value` is "HH:MM". A time off the grid that was prefilled
// gets its own cell.
export function TimeGrid({
  day,
  doctor,
  visits,
  value,
  onChange,
  earliest,
}: {
  day: string;
  doctor: string | null;
  // Every other visit; the one being rescheduled is left out by the caller.
  visits: Appointment[];
  value: string;
  onChange: (value: string) => void;
  // Minutes since midnight; earlier times are greyed out and cannot be picked (today's past).
  earliest?: number;
}) {
  const cell =
    'grid min-h-11 w-full place-items-center rounded-lg border px-1 text-[13px] tabular-nums lg:min-h-9';
  return (
    <ul aria-label="Times" className="grid grid-cols-3 gap-2">
      {slotTimes(value ? from24(value) : '').map((time) => {
        const taken = findConflict(visits, day, time, doctor);
        const on = to24(time) === value;
        const past = earliest !== undefined && minutesOf(time) < earliest;
        return (
          <li key={time}>
            {taken ? (
              <p
                title={`Booked: ${taken.patient}`}
                aria-label={`${time}, booked by ${taken.patient}`}
                className={cn(cell, 'border-transparent bg-page text-subtle line-through')}
              >
                {time}
              </p>
            ) : (
              <button
                type="button"
                disabled={past}
                aria-pressed={on}
                onClick={() => onChange(to24(time))}
                className={cn(
                  cell,
                  'outline-none disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-brand-link focus-visible:ring-offset-1',
                  on
                    ? 'border-brand bg-brand font-semibold text-white'
                    : 'border-line bg-surface font-medium text-ink hover:border-brand/50 hover:bg-page',
                )}
              >
                {time}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
