import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatientRecordsPage } from '@/features/patients/pages/PatientRecordsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// A clinic with no patients registered yet.
vi.mock('@/mocks/data/samples', () => ({ patients: [] }));

describe('Patient records with no patients yet', () => {
  it('does not print a zero in the subheading, and says what will appear here', () => {
    renderWithProviders(<PatientRecordsPage />, {
      user: fakeUser({ role: 'staff' }),
      route: '/staff/patients',
    });
    expect(screen.getByText('Patients from Pasay and Taguig will appear here')).toBeInTheDocument();
    expect(screen.queryByText(/^0 patients/)).toBeNull();
  });
});
