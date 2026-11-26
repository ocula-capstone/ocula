import { describe, expect, it } from 'vitest';
import {
  addDays,
  from24,
  minutesOf,
  rangeFor,
  to24,
  waitText,
  weekOf,
} from '@/features/appointments/days';

describe('appointment days', () => {
  it('steps across a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('gives Sunday to Saturday, also when the day is a Sunday or Saturday', () => {
    expect(weekOf('2026-11-26')[0]).toBe('2026-11-22');
    expect(weekOf('2026-11-22')).toEqual(weekOf('2026-11-28'));
  });
  it('covers a day, a week or a month', () => {
    expect(rangeFor('Month', '2026-02-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(rangeFor('Week', '2026-11-26')).toEqual({ from: '2026-11-22', to: '2026-11-28' });
  });
  it('converts times both ways', () => {
    expect(to24('4:30 PM')).toBe('16:30');
    expect(to24('12:05 AM')).toBe('00:05');
    expect(from24('16:30')).toBe('4:30 PM');
    expect(from24('00:05')).toBe('12:05 AM');
    expect(minutesOf('5:45 PM')).toBe(17 * 60 + 45);
  });
  it('says how long someone has waited', () => {
    const t = Date.parse('2026-11-26T10:00:00Z');
    expect(waitText('2026-11-26T10:00:00Z', t + 20_000)).toBe('Just checked in');
    expect(waitText('2026-11-26T10:00:00Z', t + 12 * 60_000)).toBe('Waiting 12 min');
    expect(waitText('2026-11-26T10:00:00Z', t + 65 * 60_000)).toBe('Waiting 1 h 5 min');
  });
});
