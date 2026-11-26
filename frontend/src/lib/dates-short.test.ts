import { describe, expect, it } from 'vitest';
import { formatManilaTodayShort } from '@/lib/dates';

describe('formatManilaTodayShort', () => {
  it('prints the weekday and a short month in Manila time', () => {
    // 11:00Z is 7 PM on Wednesday 25 November in Manila (UTC+8).
    expect(formatManilaTodayShort(new Date('2026-11-25T11:00:00Z'))).toBe('Wednesday, Nov 25');
  });

  it('uses the Manila day, not the UTC day', () => {
    // 18:00Z on the 25th is already 2 AM on Thursday the 26th in Manila.
    expect(formatManilaTodayShort(new Date('2026-11-25T18:00:00Z'))).toBe('Thursday, Nov 26');
  });
});
