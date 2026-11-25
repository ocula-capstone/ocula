import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PatientRecordsPage } from '@/features/patients/pages/PatientRecordsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// Test-only rows, so the test does not depend on whatever dummy data the team adds.
vi.mock('@/mocks/data/samples', () => ({
  patients: [
    {
      id: 'MRB-001',
      name: 'Ana Reyes',
      phone: '0917 111 0001',
      last: 'Sep 10, 2026',
      branch: 'Pasay',
    },
    {
      id: 'MRB-002',
      name: 'Carlos Mendoza',
      phone: '0917 111 0002',
      last: 'Sep 15, 2026',
      branch: 'Taguig',
    },
    {
      id: 'MRB-009',
      name: 'Miguel Torres',
      phone: '0917 111 0009',
      last: 'Feb 14, 2026',
      branch: 'Pasay',
    },
  ],
}));

const staff = fakeUser({ role: 'staff' });

describe('PatientRecordsPage', () => {
  it('narrows the list as you search, and says how many match', async () => {
    renderWithProviders(<PatientRecordsPage />, { user: staff });
    await userEvent.setup().type(screen.getByRole('searchbox', { name: /search/i }), 'torres');
    expect(screen.getByText('Miguel Torres')).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('1 patient');
  });

  it('shows only the chosen branch', async () => {
    renderWithProviders(<PatientRecordsPage />, { user: staff });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Taguig' }));
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).toBeNull();
  });

  it('only staff can register a new patient', () => {
    const { unmount } = renderWithProviders(<PatientRecordsPage />, { user: staff });
    expect(screen.getByRole('button', { name: 'New patient' })).toBeInTheDocument();
    unmount();
    renderWithProviders(<PatientRecordsPage />, { user: fakeUser({ role: 'optometrist' }) });
    expect(screen.queryByRole('button', { name: 'New patient' })).toBeNull();
  });
});
