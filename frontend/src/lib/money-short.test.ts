import { describe, expect, it } from 'vitest';
import { formatPesoShort } from '@/lib/money';

describe('formatPesoShort', () => {
  it('drops the centavos when the amount is whole pesos', () => {
    expect(formatPesoShort(6450)).toBe('₱6,450');
    expect(formatPesoShort('3200.00')).toBe('₱3,200');
    expect(formatPesoShort(0)).toBe('₱0');
  });

  it('keeps the centavos when there are some', () => {
    expect(formatPesoShort('6450.50')).toBe('₱6,450.50');
    expect(formatPesoShort(0.1 + 0.2)).toBe('₱0.30');
  });
});
