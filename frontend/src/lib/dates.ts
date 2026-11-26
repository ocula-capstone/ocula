// Every date and time in the app is shown in Manila time, whatever the browser's time zone.

export const MANILA_TZ = 'Asia/Manila';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TZ,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

// en-CA prints the numeric date as YYYY-MM-DD.
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// "2026-11-23T01:00:00Z" -> "Nov 23, 2026". Throws RangeError on an invalid timestamp.
export const formatManilaDate = (iso: string): string => dateFormat.format(new Date(iso));

// "2026-11-23T01:00:00Z" -> "9:00 AM". Newer ICU puts a narrow no-break space before AM/PM;
// \s matches it, so it becomes a normal space.
export const formatManilaTime = (iso: string): string =>
  timeFormat.format(new Date(iso)).replace(/\s/g, ' ');

// The Manila calendar day as "YYYY-MM-DD", for filing items under the right day.
export const manilaDayKey = (iso: string): string => dayKeyFormat.format(new Date(iso));

const todayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TZ,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const minuteFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TZ,
  minute: 'numeric',
});

const hourFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TZ,
  hour: 'numeric',
  hourCycle: 'h23',
});

// Today's Manila calendar day as "YYYY-MM-DD".
export const manilaToday = (now: Date = new Date()): string => manilaDayKey(now.toISOString());

const todayShortFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: MANILA_TZ,
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

// "Wednesday, Nov 25" in Manila, for the staff dashboard header.
export const formatManilaTodayShort = (now: Date = new Date()): string =>
  todayShortFormat.format(now);

// "Wednesday, November 25" in Manila, for page headers.
export const formatManilaToday = (now: Date = new Date()): string => todayFormat.format(now);

// Minutes since midnight in Manila, to tell which of today's times have passed.
export const manilaMinutes = (now: Date = new Date()): number =>
  manilaHour(now) * 60 + Number(minuteFormat.format(now));

// The hour in Manila, 0-23.
export const manilaHour = (now: Date = new Date()): number => Number(hourFormat.format(now));

// A date of birth as the API accepts it: a real "YYYY-MM-DD" day, from 1900, strictly before today
// in Manila. Strictly before because the server compares in UTC, 8 hours behind Manila, so
// "today" can still be in the future for it. Days are compared as text: ISO dates sort correctly,
// and it avoids time-zone surprises from new Date().
export function isBirthDate(value: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Rejects days that do not exist: 2001-02-30 rolls over to March, 2001-13-01 is invalid.
  const day = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value) return false;
  return value >= '1900-01-01' && value < manilaDayKey(now.toISOString());
}

// What a person types into the date of birth box -> "YYYY-MM-DD", or null if it is not in that shape.
// Accepts mm/dd/yyyy, mm-dd-yyyy, mmddyyyy (the phone number keypad has no slash) and a browser's
// autofilled yyyy-mm-dd. It only reshapes the text; isBirthDate decides if the day is real.
export function toIsoDate(typed: string): string | null {
  const text = typed.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  // Exactly 8 digits get slashes; otherwise a guess like "0521199" would become a wrong date.
  const withSeparators = text.replace(/^(\d{2})(\d{2})(\d{4})$/, '$1/$2/$3');
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(withSeparators);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Keeps the date of birth box in mm/dd/yyyy shape while the person types, adding the slashes.
// `deleting` is true for a backspace or delete, which must be able to remove a slash.
export function formatDateInput(raw: string, deleting = false): string {
  if (deleting) return raw.replace(/\/$/, '');
  const autofill = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw); // what a browser fills in
  if (autofill) return `${autofill[2]}/${autofill[3]}/${autofill[1]}`;

  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let formatted = digits.slice(0, 2);
  if (digits.length >= 2) formatted += `/${digits.slice(2, 4)}`;
  if (digits.length >= 4) formatted += `/${digits.slice(4)}`;
  // Only digits, or text that follows our own pattern, is reformatted. A date typed another way,
  // like 5/21/1990, is left alone so it is not turned into 52/11/990. A slash typed right after
  // the one we added ("05//") still follows our pattern: the placeholder invites typing slashes.
  const typedOnce = raw.replace(/\/{2,}/g, '/');
  return /^\d*$/.test(raw) || formatted.startsWith(typedOnce) ? formatted : raw;
}

// A "YYYY-MM-DD" day <-> a local Date for the calendar. A day has no time or zone of its own.
export const dayToDate = (day: string): Date => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const dateToDay = (date?: Date): string =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
