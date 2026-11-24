import { describe, expect, it } from 'vitest';
import { formatManilaDate, formatManilaTime, manilaDayKey } from '@/lib/dates';

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
