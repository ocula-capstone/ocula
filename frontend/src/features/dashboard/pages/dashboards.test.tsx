import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PatientDashboard } from '@/features/dashboard/pages/PatientDashboard';
import { StaffDashboard } from '@/features/dashboard/pages/StaffDashboard';
import { fakeUser, renderWithProviders } from '@/test/render';

describe('dashboards', () => {
  it('staff dashboard greets by first name and shows no revenue', () => {
    renderWithProviders(<StaffDashboard />, {
      user: fakeUser({ role: 'staff', fullName: 'Sam Staff' }),
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/, Sam$/);
    expect(document.body.textContent).not.toMatch(/revenue/i);
  });

  it('patient dashboard says hello with no emoji', () => {
    renderWithProviders(<PatientDashboard />, {
      user: fakeUser({ role: 'patient', fullName: 'Pat Patient' }),
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hello, Pat');
  });
});
