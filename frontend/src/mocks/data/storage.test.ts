import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSavedList, writeSavedList } from '@/mocks/data/storage';

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('writeSavedList', () => {
  it('saves a list that readSavedList reads back', () => {
    writeSavedList('k', [{ a: 1 }, 'two']);
    expect(readSavedList('k')).toEqual([{ a: 1 }, 'two']);
  });

  it('does not throw when the browser refuses to save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    expect(() => writeSavedList('k', [1])).not.toThrow();
  });
});
