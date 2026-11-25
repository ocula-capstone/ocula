/**
 * Clinic times are Manila time (UTC+8, no daylight saving).
 * Schedules store wall-clock times ("09:00") in Postgres TIME columns, which Prisma reads as
 * 1970-01-01T09:00:00Z; appointment instants are real timestamps.
 */
export const CLINIC_UTC_OFFSET_HOURS = 8;
const OFFSET_MS = CLINIC_UTC_OFFSET_HOURS * 60 * 60 * 1000;

export const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "09:30" → 570 */
export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
}

/** 570 → "09:30" */
export function minutesToClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** A TIME column value → minutes after midnight. */
export function timeToMinutes(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

/** Minutes after midnight → a value for a TIME column. */
export function minutesToTime(minutes: number): Date {
  return new Date(Date.UTC(1970, 0, 1, Math.floor(minutes / 60), minutes % 60));
}

/** "2026-12-01" → 0 (Sunday) … 6 (Saturday). */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True for a real calendar date like "2026-12-01". */
export function isValidDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  return (
    check.getUTCFullYear() === y &&
    check.getUTCMonth() === m - 1 &&
    check.getUTCDate() === d
  );
}

/** The instant of a Manila wall-clock time on a date. */
export function clinicInstant(date: string, minutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - OFFSET_MS);
}

/** The Manila calendar date of an instant, "YYYY-MM-DD". */
export function clinicDateOf(instant: Date): string {
  return new Date(instant.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes after Manila midnight of an instant. */
export function clinicMinutesOf(instant: Date): number {
  const shifted = new Date(instant.getTime() + OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** [start, end) of a Manila calendar day. */
export function clinicDayRange(date: string): { start: Date; end: Date } {
  const start = clinicInstant(date, 0);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd;
