import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@/lib/phone';

describe('normalizePhone', () => {
  it('turns every accepted way of typing a number into +639XXXXXXXXX', () => {
    for (const typed of ['09171234567', '9171234567', '+63 917-123-4567', ' +639171234567 ']) {
      expect(normalizePhone(typed)).toBe('+639171234567');
    }
  });

  it('returns null for anything that is not a mobile number', () => {
    for (const typed of ['', 'staff@ocula.test', '0817123456', '091712345', undefined]) {
      expect(normalizePhone(typed)).toBeNull();
    }
  });
});
