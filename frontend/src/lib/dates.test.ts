import { describe, expect, it } from 'vitest';
import {
  formatDateInput,
  formatManilaDate,
  formatManilaTime,
  isBirthDate,
  manilaDayKey,
  toIsoDate,
} from '@/lib/dates';

describe('Manila time', () => {
  it('shows the time in Manila (UTC+8)', () => {
    expect(formatManilaTime('2026-11-23T01:00:00Z')).toBe('9:00 AM');
    expect(formatManilaTime('2026-11-23T08:45:00Z')).toBe('4:45 PM');
  });

  it('shows the date in Manila', () => {
    expect(formatManilaDate('2026-11-23T01:00:00Z')).toBe('Nov 23, 2026');
  });

  it('manilaDayKey uses the Manila date, not the UTC date', () => {
    // 16:30 UTC on the 23rd is 00:30 on the 24th in Manila.
    expect(manilaDayKey('2026-11-23T16:30:00Z')).toBe('2026-11-24');
    expect(manilaDayKey('2026-11-23T15:59:00Z')).toBe('2026-11-23');
  });

  it('throws on an invalid timestamp instead of showing garbage', () => {
    expect(() => formatManilaDate('not a date')).toThrow();
  });
});

describe('isBirthDate', () => {
  // 01:00 Manila on 24 Nov 2026 is still 23 Nov in UTC.
  const now = new Date('2026-11-23T17:00:00Z');

  it('accepts a real past day', () => {
    expect(isBirthDate('1990-05-21', now)).toBe(true);
    expect(isBirthDate('2026-11-23', now)).toBe(true);
  });

  it('refuses today and later in Manila, even while UTC is still on the day before', () => {
    expect(isBirthDate('2026-11-24', now)).toBe(false);
    expect(isBirthDate('2027-01-01', now)).toBe(false);
  });

  it('refuses days that do not exist, wrong formats, typo years and empty input', () => {
    for (const bad of ['2001-02-30', '2001-13-01', '21/05/1990', '1990-5-21', '0019-05-21', '']) {
      expect(isBirthDate(bad, now)).toBe(false);
    }
  });
});

describe('toIsoDate', () => {
  it('turns every way of typing a date into YYYY-MM-DD', () => {
    for (const typed of ['05/21/1990', '05211990', '05-21-1990', '5/21/1990', ' 1990-05-21 ']) {
      expect(toIsoDate(typed)).toBe('1990-05-21');
    }
  });

  it('returns null when the text is not a date shape', () => {
    for (const typed of ['', 'May 21 1990', '05/21/90', '0521199', '05/21/1990/1']) {
      expect(toIsoDate(typed)).toBeNull();
    }
  });
});

describe('formatDateInput', () => {
  it('adds the slashes as digits are typed', () => {
    // [what the box holds after a keystroke, what it should show]
    const keystrokes = [
      ['0', '0'],
      ['05', '05/'], // two digits: the first slash
      ['05/2', '05/2'], // typing on after our own slash
      ['05/21', '05/21/'], // four digits: the second slash
      ['05/21/1', '05/21/1'],
      ['05/21/1990', '05/21/1990'],
      ['05211990', '05/21/1990'], // all digits at once
    ];
    for (const [typed, shown] of keystrokes) expect(formatDateInput(typed)).toBe(shown);
  });

  it('lets backspace remove a slash instead of putting it back', () => {
    expect(formatDateInput('05/', true)).toBe('05');
    expect(formatDateInput('05/21/', true)).toBe('05/21');
    expect(formatDateInput('05/21/199', true)).toBe('05/21/199');
  });

  it('leaves a date typed another way alone', () => {
    expect(formatDateInput('5/21/1990')).toBe('5/21/1990');
    expect(formatDateInput('5/')).toBe('5/');
  });

  it('turns a browser autofill (yyyy-mm-dd) into mm/dd/yyyy', () => {
    expect(formatDateInput('1990-05-21')).toBe('05/21/1990');
  });

  it('gives a result that toIsoDate reads back', () => {
    expect(toIsoDate(formatDateInput('05211990'))).toBe('1990-05-21');
  });
});
