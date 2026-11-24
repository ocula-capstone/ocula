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
