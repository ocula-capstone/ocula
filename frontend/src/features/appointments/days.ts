import { dateToDay, dayToDate } from '@/lib/dates';

export const addDays = (day: string, n: number): string => {
  const d = dayToDate(day);
  d.setDate(d.getDate() + n);
  return dateToDay(d);
};

// The Sunday-to-Saturday days around `day`, the same week the calendar draws on one row.
export function weekOf(day: string): string[] {
  const sunday = addDays(day, -dayToDate(day).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

export type Tab = 'Day' | 'Week' | 'Month';
export interface Range {
  from: string;
  to: string;
}

// The days a tab covers around `anchor`: that day, its week, or its calendar month.
export function rangeFor(tab: Tab, anchor: string): Range {
  if (tab === 'Day') return { from: anchor, to: anchor };
  if (tab === 'Week') {
    const w = weekOf(anchor);
    return { from: w[0], to: w[6] };
  }
  const d = dayToDate(anchor);
  return {
    from: dateToDay(new Date(d.getFullYear(), d.getMonth(), 1)),
    to: dateToDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

// The quick choices of the Date filter. Any number can be ticked at once; a visit shows if its day
// falls in any of them (or in the calendar range).
export interface DatePreset {
  id: string;
  label: string;
  range: Range;
}
export const datePresets = (today: string): DatePreset[] => [
  { id: 'today', label: 'Today', range: rangeFor('Day', today) },
  { id: 'tomorrow', label: 'Tomorrow', range: rangeFor('Day', addDays(today, 1)) },
  { id: 'week', label: 'This week', range: rangeFor('Week', today) },
  { id: 'next7', label: 'Next 7 days', range: { from: today, to: addDays(today, 6) } },
  { id: 'month', label: 'This month', range: rangeFor('Month', today) },
];
// What the list shows while nothing is picked in the Date filter (its button then says "Select").
export const DEFAULT_PICKS = ['next7'];

// Every distinct day the ranges cover, oldest first.
export function daysInAll(ranges: Range[]): string[] {
  const days = new Set<string>();
  for (const r of ranges) for (const d of daysIn(r)) days.add(d);
  return [...days].sort();
}

// Every day from `from` to `to`, both included.
export function daysIn({ from, to }: Range): string[] {
  const days: string[] = [];
  for (let d = from; d <= to && days.length < 400; d = addDays(d, 1)) days.push(d);
  return days;
}

const short = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});
const month = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

// "Wed, Nov 25"
export const formatDay = (day: string): string => short.format(dayToDate(day));

// "Wed, Nov 25" for one day, "Nov 23 – Nov 29" for a span.
export const formatRange = ({ from, to }: Range): string =>
  from === to
    ? formatDay(from)
    : `${month.format(dayToDate(from))} – ${month.format(dayToDate(to))}`;

// "4:30 PM" <-> "16:30", the value of <input type="time">.
export function to24(time: string): string {
  const [, h, m, ap] = /(\d+):(\d+)\s*(AM|PM)/i.exec(time) ?? [];
  if (!h) return '';
  return `${String((Number(h) % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${m}`;
}
export function from24(value: string): string {
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
// Minutes since midnight, so visits and open slots sort into one timeline.
export const minutesOf = (time: string): number => {
  const [h, m] = to24(time).split(':').map(Number);
  return h * 60 + m;
};

// "Waiting 12 min" text for a visit checked in at `since` (ISO).
export function waitText(since: string, now: number): string {
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  if (mins < 1) return 'Just checked in';
  return mins < 60 ? `Waiting ${mins} min` : `Waiting ${Math.floor(mins / 60)} h ${mins % 60} min`;
}
