import { describe, expect, it } from 'vitest';
import { formatDocNo, plural } from '@/lib/format';

describe('formatDocNo', () => {
  it('pads to six digits', () => {
    expect(formatDocNo('P', 123)).toBe('P-000123');
    expect(formatDocNo('OR', 1)).toBe('OR-000001');
  });

  it('does not truncate longer numbers', () => {
    expect(formatDocNo('JO', 1234567)).toBe('JO-1234567');
  });
});

describe('plural', () => {
  it('counts with the singular for one and the plural otherwise', () => {
    expect(plural(1, 'day')).toBe('1 day');
    expect(plural(0, 'day')).toBe('0 days');
    expect(plural(3, 'week')).toBe('3 weeks');
    expect(plural(2, 'invoice', 'invoices')).toBe('2 invoices');
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(1248, 'patient')).toBe('1,248 patients');
  });
});
