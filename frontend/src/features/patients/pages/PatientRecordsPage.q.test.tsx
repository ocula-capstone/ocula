import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { PatientRecordsPage } from '@/features/patients/pages/PatientRecordsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

vi.mock('@/mocks/data/samples', () => ({
  patients: [
    {
      id: 'P-000001',
      name: 'Ana Reyes',
      phone: '0917 111 0001',
      lastVisit: '2026-09-10',
      nextRecall: null,
      branch: 'Pasay',
      balance: 0,
    },
    {
      id: 'P-000009',
      name: 'Miguel Torres',
      phone: '0917 111 0009',
      lastVisit: '2026-02-14',
      nextRecall: null,
      branch: 'Pasay',
      balance: 0,
    },
  ],
}));

function Address() {
  return <p data-testid="address">{useLocation().search || '(none)'}</p>;
}

function renderAt(route: string) {
  return renderWithProviders(
    <Routes>
      <Route
        path="/staff/patients"
        element={
          <>
            <PatientRecordsPage />
            <Address />
          </>
        }
      />
    </Routes>,
    { user: fakeUser({ role: 'staff' }), route },
  );
}

describe('Patient records opened from the top-bar search', () => {
  it('shows only matches, says what was searched, and can be cleared', async () => {
    renderAt('/staff/patients?q=torres');
    expect(screen.getByText('Miguel Torres')).toBeInTheDocument();
    expect(screen.queryByText('Ana Reyes')).toBeNull();
    expect(screen.getByText('Results for “torres”')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('Ana Reyes')).toBeInTheDocument();
    expect(screen.getByTestId('address')).toHaveTextContent('(none)');
  });

  it('searches by ID and phone too', () => {
    renderAt('/staff/patients?q=0917%20111%200001');
    expect(screen.getByText('Ana Reyes')).toBeInTheDocument();
    expect(screen.queryByText('Miguel Torres')).toBeNull();
  });
});
