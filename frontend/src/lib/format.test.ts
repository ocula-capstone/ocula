import { describe, expect, it } from 'vitest';
import { formatDocNo } from '@/lib/format';

describe('formatDocNo', () => {
  it('pads to six digits', () => {
    expect(formatDocNo('P', 123)).toBe('P-000123');
    expect(formatDocNo('OR', 1)).toBe('OR-000001');
  });

  it('does not truncate longer numbers', () => {
    expect(formatDocNo('JO', 1234567)).toBe('JO-1234567');
  });
});
