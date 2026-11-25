import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// The real API is replaced so the test never touches the network.
vi.mock('@/api/auth', () => ({ changePassword: vi.fn().mockResolvedValue(undefined) }));

async function changePasswordAs(mustChangePassword: boolean) {
  const passwordChanged = vi.fn();
  renderWithProviders(
    <Routes>
      <Route path="/staff/change-password" element={<ChangePasswordPage />} />
      <Route path="/staff" element={<p>staff home</p>} />
    </Routes>,
    {
      user: fakeUser({ role: 'staff', mustChangePassword }),
      route: '/staff/change-password',
      auth: { passwordChanged },
    },
  );
  const typing = userEvent.setup();
  await typing.type(screen.getByLabelText('Current password'), 'temp-password-1');
  await typing.type(screen.getByLabelText('New password'), 'my-new-password');
  await typing.type(screen.getByLabelText('Confirm new password'), 'my-new-password');
  await typing.click(screen.getByRole('button', { name: 'Change password' }));
  return passwordChanged;
}

describe('ChangePasswordPage', () => {
  it('after a forced change, clears the flag and sends the user to their home', async () => {
    const passwordChanged = await changePasswordAs(true);
    expect(await screen.findByText('staff home')).toBeTruthy();
    expect(passwordChanged).toHaveBeenCalledOnce();
  });

  it('after a voluntary change, stays on the page and says it worked', async () => {
    await changePasswordAs(false);
    expect(await screen.findByText('Your password has been changed.')).toBeTruthy();
    expect(screen.queryByText('staff home')).toBeNull();
  });
});
