import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BookRedirect } from '@/features/appointments/pages/BookRedirect';
import { fakeUser, renderWithProviders } from '@/test/render';

// Shows where the redirect landed and what it carried.
function Landing({ name }: { name: string }) {
  const { state } = useLocation();
  return (
    <p>
      {name} {(state as { from?: string } | null)?.from ?? ''}
    </p>
  );
}

const routes = (
  <Routes>
    <Route path="/book" element={<BookRedirect />} />
    <Route path="/register" element={<Landing name="register" />} />
    <Route path="/me/appointments" element={<Landing name="my appointments" />} />
    <Route path="/staff" element={<Landing name="staff home" />} />
  </Routes>
);

describe('BookRedirect', () => {
  it('sends a signed-out visitor to register, and remembers to come back to appointments', () => {
    renderWithProviders(routes, { route: '/book' });
    expect(screen.getByText('register /me/appointments')).toBeInTheDocument();
  });

  it('sends a signed-in patient to their appointments', () => {
    renderWithProviders(routes, { user: fakeUser({ role: 'patient' }), route: '/book' });
    expect(screen.getByText('my appointments')).toBeInTheDocument();
  });

  it('sends staff to their own home, not the patient area', () => {
    renderWithProviders(routes, { user: fakeUser({ role: 'staff' }), route: '/book' });
    expect(screen.getByText('staff home')).toBeInTheDocument();
  });
});
