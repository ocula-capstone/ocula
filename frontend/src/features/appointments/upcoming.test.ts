import { describe, expect, it } from 'vitest';
import { upcomingFor } from '@/features/appointments/store';
import type { Appointment } from '@/types/clinic';

const visit = (over: Partial<Appointment>): Appointment => ({
  id: 'a',
  patient: 'Ana Reyes',
  day: '2026-11-27',
  time: '9:00 AM',
  service: 'Eye exam',
  doctor: null,
  status: 'Booked',
  ...over,
});

describe('upcomingFor', () => {
  it('counts a patient’s visits from today on, and nothing finished, cancelled or missed', () => {
    const visits = [
      visit({ id: '1' }),
      visit({ id: '2', day: '2026-11-26' }), // today counts
      visit({ id: '3', day: '2026-11-25' }), // yesterday
      visit({ id: '4', status: 'Cancelled' }),
      visit({ id: '5', status: 'No-show' }),
      visit({ id: '6', status: 'Done' }),
      visit({ id: '7', patient: 'Someone Else' }),
    ];
    expect(upcomingFor(visits, 'Ana Reyes', '2026-11-26').map((v) => v.id)).toEqual(['1', '2']);
  });
});
