import { describe, expect, it } from 'vitest';
import { pageItems } from '@/lib/pagination';

describe('pageItems', () => {
  it('shows every page when there are few', () => {
    expect(pageItems(1, 1)).toEqual([1]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps first, last and the pages around the current one, with gaps as ellipses', () => {
    expect(pageItems(1, 25)).toEqual([1, 2, 3, '…', 25]);
    expect(pageItems(2, 25)).toEqual([1, 2, 3, '…', 25]);
    expect(pageItems(13, 25)).toEqual([1, '…', 12, 13, 14, '…', 25]);
    expect(pageItems(24, 25)).toEqual([1, '…', 23, 24, 25]);
    expect(pageItems(25, 25)).toEqual([1, '…', 23, 24, 25]);
  });

  it('does not hide a single page behind an ellipsis', () => {
    expect(pageItems(5, 9)).toEqual([1, '…', 4, 5, 6, '…', 9]);
    expect(pageItems(4, 9)).toEqual([1, 2, 3, 4, 5, '…', 9]);
  });
});
