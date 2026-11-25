import {
  clinicDateOf,
  clinicDayRange,
  clinicInstant,
  clinicMinutesOf,
  clockToMinutes,
  dayOfWeek,
  isValidDate,
  minutesToClock,
  minutesToTime,
  timeToMinutes,
} from './clinic-time.js';

describe('clinic time (Manila, UTC+8)', () => {
  it('converts clock strings and TIME values', () => {
    expect(clockToMinutes('09:30')).toBe(570);
    expect(minutesToClock(570)).toBe('09:30');
    expect(timeToMinutes(minutesToTime(17 * 60))).toBe(17 * 60);
  });

  it('knows the weekday of a date', () => {
    expect(dayOfWeek('2026-11-30')).toBe(1); // Monday
    expect(dayOfWeek('2026-12-06')).toBe(0); // Sunday
  });

  it('places Manila times on the right instant', () => {
    expect(clinicInstant('2026-12-01', 9 * 60).toISOString()).toBe(
      '2026-12-01T01:00:00.000Z',
    );
    expect(clinicDateOf(new Date('2026-11-30T17:00:00Z'))).toBe('2026-12-01'); // 1 AM Manila
    expect(clinicMinutesOf(new Date('2026-12-01T01:30:00Z'))).toBe(9 * 60 + 30);
    const { start, end } = clinicDayRange('2026-12-01');
    expect(start.toISOString()).toBe('2026-11-30T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T16:00:00.000Z');
  });

  it('validates calendar dates', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-2-3')).toBe(false);
  });
});
