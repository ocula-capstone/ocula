import { formatDay, minutesOf } from '@/features/appointments/days';
import { dayToDate, manilaMinutes, manilaToday } from '@/lib/dates';
import { plural } from '@/lib/format';
import type { Appointment } from '@/types/clinic';

export interface VisitGroup {
  key: 'attention' | 'exam' | 'later' | 'done' | 'away';
  title: string;
  visits: Appointment[];
}

const byTime = (a: Appointment, b: Appointment) => minutesOf(a.time) - minutesOf(b.time);
const didNotHappen = (v: Appointment) => v.status === 'Cancelled' || v.status === 'No-show';

// One day's visits in five groups, each in its own order: who needs attention now (patients who
// are waiting, longest first), who is in the exam room, who is still to come, who is done, and who
// is not attending (cancelled and missed). Each group holds one kind of visit, and a group with
// nothing in it is left out.
export function groupVisits(visits: Appointment[], day: string, today: string): VisitGroup[] {
  const waiting = visits
    .filter((v) => v.status === 'Waiting')
    .sort((a, b) => (a.waitingSince ?? '').localeCompare(b.waitingSince ?? '') || byTime(a, b));
  const groups: VisitGroup[] = [
    { key: 'attention', title: 'Needs attention now', visits: waiting },
    {
      key: 'exam',
      title: 'In exam',
      visits: visits.filter((v) => v.status === 'In exam').sort(byTime),
    },
    {
      key: 'later',
      title: day === today ? 'Later today' : 'Scheduled',
      visits: visits.filter((v) => v.status === 'Booked').sort(byTime),
    },
    { key: 'done', title: 'Done', visits: visits.filter((v) => v.status === 'Done').sort(byTime) },
    { key: 'away', title: 'Not attending', visits: visits.filter(didNotHappen).sort(byTime) },
  ];
  return groups.filter((g) => g.visits.length > 0);
}

// "Showing all 11 visits today, plus 2 that did not happen." The second part only when some did not.
// `when` finishes the sentence: "today", or "on Fri, Nov 27".
export const summaryLine = (shown: number, away: number, when: string): string =>
  `Showing all ${plural(shown, 'visit')} ${when}${away > 0 ? `, plus ${away} that did not happen` : ''}.`;

export const countThatHappened = (visits: Appointment[]) =>
  visits.filter((v) => !didNotHappen(v)).length;
export const countThatDidNot = (visits: Appointment[]) => visits.filter(didNotHappen).length;

// How many times this patient has missed a visit, over every day: by record id, or by name when a
// visit has none.
export function countNoShows(all: Appointment[], of: Appointment): number {
  const same = (v: Appointment) =>
    of.patientId && v.patientId ? v.patientId === of.patientId : v.patient === of.patient;
  return all.filter((v) => v.status === 'No-show' && same(v)).length;
}

// "Mark as no-show" is offered from 15 minutes after the visit starts. Always on an earlier day,
// never on a later one.
export function canMarkNoShow(v: Appointment, now: Date = new Date()): boolean {
  const today = manilaToday(now);
  if (v.day !== today) return v.day < today;
  return manilaMinutes(now) >= minutesOf(v.time) + 15;
}

const WHO = { patient: ' by patient', clinic: ' by clinic', other: '' } as const;
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// "Cancelled by patient, Nov 25".
export function cancelNote(v: Appointment): string {
  const who = v.cancelledBy ? WHO[v.cancelledBy] : '';
  const when = v.cancelledOn ? `, ${SHORT.format(dayToDate(v.cancelledOn))}` : '';
  return `Cancelled${who}${when}`;
}

// "today" for today, else "on Fri, Nov 27".
export const dayWords = (day: string, today: string): string =>
  day === today ? 'today' : `on ${formatDay(day)}`;
