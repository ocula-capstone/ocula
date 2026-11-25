import { describe, expect, it } from 'vitest';
import { shortBranchName } from '@/lib/branchName';

describe('shortBranchName', () => {
  it('shortens the clinic branch names for the top bar', () => {
    expect(shortBranchName('MRB Optical Clinic Pasay')).toBe('MRB Optical · Pasay');
    expect(shortBranchName('MRB Optical Clinic Taguig')).toBe('MRB Optical · Taguig');
  });

  it('leaves any other name as it is', () => {
    expect(shortBranchName('Main branch')).toBe('Main branch');
  });
});
