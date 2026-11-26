import { describe, expect, it } from 'vitest';
import { branchCardText } from '@/lib/branchName';

describe('branchCardText', () => {
  it('splits a clinic branch into a title and "<place> branch"', () => {
    expect(branchCardText('MRB Optical Clinic Pasay')).toEqual({
      mark: 'MR',
      title: 'MRB Optical Clinic',
      sub: 'Pasay branch',
    });
  });

  it('uses the whole name when it does not follow that pattern', () => {
    expect(branchCardText('Main branch')).toEqual({ mark: 'MA', title: 'Main branch', sub: '' });
  });
});
