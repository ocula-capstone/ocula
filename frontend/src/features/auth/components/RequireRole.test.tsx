import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RequireRole } from '@/features/auth/components/RequireRole';
import { fakeUser, renderWithProviders } from '@/test/render';

// Two guarded areas, each with a home and a change-password page, as in the real router.
function renderAt(route: string, user = fakeUser({ role: 'staff' })) {
  return renderWithProviders(
    <Routes>
      <Route element={<RequireRole role="staff" />}>
        <Route path="/staff" element={<p>staff home</p>} />
        <Route path="/staff/change-password" element={<p>staff change password</p>} />
      </Route>
      <Route element={<RequireRole role="patient" />}>
        <Route path="/me" element={<p>patient home</p>} />
        <Route path="/me/change-password" element={<p>patient change password</p>} />
      </Route>
    </Routes>,
    { user, route },
  );
}

describe('RequireRole with a temporary password', () => {
  it('sends the user to their change-password page from anywhere in their area', () => {
    renderAt('/staff', fakeUser({ role: 'staff', mustChangePassword: true }));
    expect(screen.getByText('staff change password')).toBeTruthy();
  });

  it('lets them stay on the change-password page, with no redirect loop', () => {
    renderAt('/staff/change-password', fakeUser({ role: 'staff', mustChangePassword: true }));
    expect(screen.getByText('staff change password')).toBeTruthy();
  });

  it('checks the role first, so another area still ends on their own change-password page', () => {
    renderAt('/staff', fakeUser({ role: 'patient', mustChangePassword: true }));
    expect(screen.getByText('patient change password')).toBeTruthy();
  });

  it('leaves everyone else alone', () => {
    renderAt('/staff', fakeUser({ role: 'staff', mustChangePassword: false }));
    expect(screen.getByText('staff home')).toBeTruthy();
  });
});
