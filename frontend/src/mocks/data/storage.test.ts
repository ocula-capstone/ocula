import { describe, expect, it } from 'vitest';
import { readSavedList } from '@/mocks/data/storage';

describe('readSavedList', () => {
  it('returns the saved list', () => {
    localStorage.setItem('k', JSON.stringify([{ a: 1 }, 'two']));
    expect(readSavedList('k')).toEqual([{ a: 1 }, 'two']);
  });

  it('returns an empty list when nothing is saved', () => {
    expect(readSavedList('missing')).toEqual([]);
  });

  it('returns an empty list when the saved text is corrupt', () => {
    localStorage.setItem('k', '{not json');
    expect(readSavedList('k')).toEqual([]);
  });

  it('returns an empty list when the saved value is not a list', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    expect(readSavedList('k')).toEqual([]);
  });
});
