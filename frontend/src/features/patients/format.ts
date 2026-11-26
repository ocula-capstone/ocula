import { plural } from '@/lib/format';

// Dates as the patient list prints them. Days are "YYYY-MM-DD" in Manila time; `today` is passed
// in (see manilaToday) so the wording can be tested.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parts = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d };
};
const dayNumber = (day: string) => {
  const { y, m, d } = parts(day);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

// Whole calendar days from `day` to today: 0 for today, negative for a day still to come.
export const daysSince = (day: string, today: string): number => dayNumber(today) - dayNumber(day);

// "Nov 20" (this year) or "Oct 14, 2025" (an earlier year).
export const formatDay = (day: string, today: string): string => {
  const { y, m, d } = parts(day);
  const label = `${MONTHS[m - 1]} ${d}`;
  return y === parts(today).y ? label : `${label}, ${y}`;
};

// "Today", or the day as above.
export const formatLastVisit = (day: string, today: string): string =>
  day === today ? 'Today' : formatDay(day, today);

// What the Last visit button says for a calendar range ("to" is empty while only the first day
// is picked): "Nov 18", "Nov 18 – Nov 20", or "From Nov 18" for a day with an open end.
export function formatDayRange(from: string, to: string, today: string): string {
  if (!to) return `From ${formatDay(from, today)}`;
  return from === to
    ? formatDay(from, today)
    : `${formatDay(from, today)} – ${formatDay(to, today)}`;
}

export interface RecallStatus {
  text: string;
  // overdue and today are shown in bold amber; later is plain; none is a dash.
  tone: 'overdue' | 'today' | 'later' | 'none';
}

// "3 weeks overdue", "Due today", "Nov 2027", or a dash when no recall is planned.
export function recallStatus(day: string | null, today: string): RecallStatus {
  if (!day) return { text: '—', tone: 'none' };
  const late = dayNumber(today) - dayNumber(day);
  if (late > 0) {
    const text = late < 7 ? plural(late, 'day') : plural(Math.floor(late / 7), 'week');
    return { text: `${text} overdue`, tone: 'overdue' };
  }
  if (late === 0) return { text: 'Due today', tone: 'today' };
  const { y, m } = parts(day);
  return { text: `${MONTHS[m - 1]} ${y}`, tone: 'later' };
}
