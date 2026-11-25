import { describe, expect, it } from 'vitest';
import { formatPeso, sumCentavos, toCentavos } from '@/lib/money';

describe('toCentavos', () => {
  it('parses decimal strings and integers', () => {
    expect(toCentavos('1234.5')).toBe(123450);
    expect(toCentavos('0.07')).toBe(7);
    expect(toCentavos(12)).toBe(1200);
  });

  it('parses negatives', () => {
    expect(toCentavos('-0.05')).toBe(-5);
    expect(toCentavos('-12.30')).toBe(-1230);
  });

  it('never returns negative zero', () => {
    expect(toCentavos('-0')).toBe(0);
  });

  it('rejects anything that is not an amount of at most two decimals', () => {
    expect(() => toCentavos('abc')).toThrow('Invalid amount');
    expect(() => toCentavos('')).toThrow('Invalid amount');
    expect(() => toCentavos('1.234')).toThrow('Invalid amount');
    expect(() => toCentavos(Number.NaN)).toThrow('Invalid amount');
  });
});

describe('sumCentavos', () => {
  it('sums without float error', () => {
    expect(sumCentavos(['0.10', '0.20'])).toBe(30);
  });

  it('sums an empty list to zero', () => {
    expect(sumCentavos([])).toBe(0);
  });
});

describe('formatPeso', () => {
  it('formats with a peso sign, separators and two decimals', () => {
    expect(formatPeso('1234.5')).toBe('₱1,234.50');
    expect(formatPeso(0)).toBe('₱0.00');
    expect(formatPeso('1000000')).toBe('₱1,000,000.00');
  });

  it('puts the minus sign before the peso sign', () => {
    expect(formatPeso('-5')).toBe('-₱5.00');
  });
});
