import { describe, expect, it } from 'vitest';
import {
  daysSince,
  formatDay,
  formatDayRange,
  formatLastVisit,
  recallStatus,
} from '@/features/patients/format';

const TODAY = '2026-11-25';

describe('formatLastVisit', () => {
  it('says Today for a visit today', () => {
    expect(formatLastVisit('2026-11-25', TODAY)).toBe('Today');
  });

  it('shows month and day for earlier this year', () => {
    expect(formatLastVisit('2026-11-20', TODAY)).toBe('Nov 20');
    expect(formatLastVisit('2026-01-02', TODAY)).toBe('Jan 2');
  });

  it('adds the year for an earlier year', () => {
    expect(formatLastVisit('2025-10-14', TODAY)).toBe('Oct 14, 2025');
  });
});

describe('recallStatus', () => {
  it('is empty when no recall is planned', () => {
    expect(recallStatus(null, TODAY)).toEqual({ text: '—', tone: 'none' });
  });

  it('counts days overdue under a week, then weeks', () => {
    expect(recallStatus('2026-11-24', TODAY)).toEqual({ text: '1 day overdue', tone: 'overdue' });
    expect(recallStatus('2026-11-22', TODAY)).toEqual({ text: '3 days overdue', tone: 'overdue' });
    expect(recallStatus('2026-11-18', TODAY)).toEqual({ text: '1 week overdue', tone: 'overdue' });
    expect(recallStatus('2026-11-04', TODAY)).toEqual({ text: '3 weeks overdue', tone: 'overdue' });
  });

  it('says Due today on the day', () => {
    expect(recallStatus('2026-11-25', TODAY)).toEqual({ text: 'Due today', tone: 'today' });
  });

  it('shows month and year for a recall still to come', () => {
    expect(recallStatus('2027-11-10', TODAY)).toEqual({ text: 'Nov 2027', tone: 'later' });
    expect(recallStatus('2026-12-01', TODAY)).toEqual({ text: 'Dec 2026', tone: 'later' });
  });
});

describe('daysSince', () => {
  it('counts whole calendar days back from today', () => {
    expect(daysSince('2026-11-25', TODAY)).toBe(0);
    expect(daysSince('2026-11-18', TODAY)).toBe(7);
    expect(daysSince('2025-11-25', TODAY)).toBe(365);
  });

  it('is negative for a day still to come', () => {
    expect(daysSince('2026-11-26', TODAY)).toBe(-1);
  });
});

describe('formatDay', () => {
  it('prints a day without the word Today, with the year only for an earlier year', () => {
    expect(formatDay('2026-11-25', TODAY)).toBe('Nov 25');
    expect(formatDay('2026-11-18', TODAY)).toBe('Nov 18');
    expect(formatDay('2025-10-14', TODAY)).toBe('Oct 14, 2025');
  });
});

describe('formatDayRange', () => {
  it('prints both ends, a single day, or an open end', () => {
    expect(formatDayRange('2026-11-18', '2026-11-20', TODAY)).toBe('Nov 18 – Nov 20');
    expect(formatDayRange('2026-11-18', '2026-11-18', TODAY)).toBe('Nov 18');
    expect(formatDayRange('2026-11-20', '', TODAY)).toBe('From Nov 20');
  });
});
