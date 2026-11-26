import { from24, minutesOf } from '@/features/appointments/days';
import { findConflict, VISIT_MINUTES } from '@/features/appointments/store';
import type { Appointment } from '@/types/clinic';

// shortcut: the clinic day shown in the picker, until branch opening hours exist.
const FIRST = '9:00 AM';
const LAST = '7:30 PM';

// The half-hour times of the clinic day, plus `extra` when a time off the grid was prefilled (an
// open slot at 7:45 PM, or a visit being moved).
export function slotTimes(extra = ''): string[] {
  const out: string[] = [];
  for (let m = minutesOf(FIRST); m <= minutesOf(LAST); m += VISIT_MINUTES) {
    out.push(
      from24(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`),
    );
  }
  if (extra && !out.includes(extra)) out.push(extra);
  return out.sort((a, b) => minutesOf(a) - minutesOf(b));
}

// How many half-hour times are still free on `day` for `doctor` (null = any doctor). Times before
// `earliest` (minutes since midnight; today's past, for a patient booking online) are not counted.
export const freeCount = (
  visits: Appointment[],
  day: string,
  doctor: string | null,
  earliest = 0,
): number =>
  slotTimes().filter((t) => minutesOf(t) >= earliest && !findConflict(visits, day, t, doctor))
    .length;
