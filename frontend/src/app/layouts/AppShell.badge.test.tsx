import { screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/app/layouts/AppShell';
import { fakeUser, renderWithProviders } from '@/test/render';

// Three overdue recalls and one due today: only the overdue ones count on the badge.
vi.mock('@/mocks/data/samples', () => ({
  recalls: [
    { id: 'a', patient: 'A', reason: 'x', due: '1 week overdue', phone: '1', status: 'Overdue' },
    { id: 'b', patient: 'B', reason: 'x', due: '2 weeks overdue', phone: '1', status: 'Overdue' },
    { id: 'c', patient: 'C', reason: 'x', due: '3 weeks overdue', phone: '1', status: 'Overdue' },
    { id: 'd', patient: 'D', reason: 'x', due: 'due today', phone: '1', status: 'Due today' },
  ],
  unreadNotifications: 2,
}));

function renderStaff() {
  return renderWithProviders(
    <Routes>
      <Route path="/staff" element={<AppShell />}>
        <Route index element={<p>Home page</p>} />
      </Route>
    </Routes>,
    {
      user: fakeUser({
        role: 'staff',
        branches: [{ id: 'b-pasay', code: 'PASAY', name: 'MRB Optical Clinic Pasay' }],
      }),
      route: '/staff',
    },
  );
}

describe('AppShell badges', () => {
  it('Recalls shows how many recalls are overdue, readable by screen readers', () => {
    renderStaff();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('link', { name: 'Recalls (3 overdue)' })).toBeInTheDocument();
  });

  it('the bell says how many notifications are unread', () => {
    renderStaff();
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
  });
});
