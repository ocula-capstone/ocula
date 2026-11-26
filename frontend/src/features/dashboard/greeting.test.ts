import { describe, expect, it } from 'vitest';
import { greeting, greetingName } from '@/features/dashboard/greeting';

describe('greeting', () => {
  // Manila is UTC+8, so 01:00Z is 9 AM there and 06:00Z is 2 PM.
  it('follows the time of day in Manila', () => {
    expect(greeting(new Date('2026-11-25T01:00:00Z'))).toBe('Good morning');
    expect(greeting(new Date('2026-11-25T06:00:00Z'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-11-25T11:00:00Z'))).toBe('Good evening');
  });

  it('uses the first name, or title and surname for doctors', () => {
    expect(greetingName('Sam Staff')).toBe('Sam');
    expect(greetingName('Dr. Olivia Optometrist')).toBe('Dr. Optometrist');
  });
});
