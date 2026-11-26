import { describe, expect, it } from 'vitest';
import { findConflict } from '@/features/appointments/store';
import type { Appointment } from '@/types/clinic';

const visit = (over: Partial<Appointment>): Appointment => ({
  id: 'a1',
  patient: 'Ana Reyes',
  day: '2026-11-26',
  time: '6:30 PM',
  service: 'Eye exam',
  doctor: 'Dr. Ben Lim',
  status: 'Booked',
  ...over,
});

describe('findConflict', () => {
  const visits = [visit({})];
  it('blocks the same doctor at the same time', () => {
    expect(findConflict(visits, '2026-11-26', '6:30 PM', 'Dr. Ben Lim')).toBeDefined();
  });
  it('blocks any start closer than a visit length, but not one right after', () => {
    expect(findConflict(visits, '2026-11-26', '6:45 PM', 'Dr. Ben Lim')).toBeDefined();
    expect(findConflict(visits, '2026-11-26', '6:15 PM', 'Dr. Ben Lim')).toBeDefined();
    expect(findConflict(visits, '2026-11-26', '7:00 PM', 'Dr. Ben Lim')).toBeUndefined();
    expect(findConflict(visits, '2026-11-26', '6:00 PM', 'Dr. Ben Lim')).toBeUndefined();
  });
  it('allows another doctor, another time or another day', () => {
    expect(findConflict(visits, '2026-11-26', '6:30 PM', 'Dr. Olivia Reyes')).toBeUndefined();
    expect(findConflict(visits, '2026-11-26', '7:00 PM', 'Dr. Ben Lim')).toBeUndefined();
    expect(findConflict(visits, '2026-11-27', '6:30 PM', 'Dr. Ben Lim')).toBeUndefined();
  });
  it('treats "Any doctor" as clashing with everyone, both ways', () => {
    expect(findConflict(visits, '2026-11-26', '6:30 PM', null)).toBeDefined();
    expect(
      findConflict([visit({ doctor: null })], '2026-11-26', '6:30 PM', 'Dr. Ben Lim'),
    ).toBeDefined();
  });
  it('ignores cancelled and no-show visits', () => {
    expect(
      findConflict([visit({ status: 'Cancelled' })], '2026-11-26', '6:30 PM', null),
    ).toBeUndefined();
    expect(
      findConflict([visit({ status: 'No-show' })], '2026-11-26', '6:30 PM', null),
    ).toBeUndefined();
  });
});
