import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

const PASAY = { id: 'b-pasay', code: 'PASAY', name: 'MRB Optical Clinic Pasay' };

describe('SettingsPage', () => {
  it('shows the signed-in person and links to change password', () => {
    renderWithProviders(<SettingsPage />, {
      user: fakeUser({
        role: 'staff',
        fullName: 'Sam Staff',
        phone: '+639171234567',
        email: 'staff@ocula.test',
        branches: [PASAY],
      }),
    });
    expect(screen.getByText('Sam Staff')).toBeInTheDocument();
    expect(screen.getByText('+639171234567')).toBeInTheDocument();
    expect(screen.getByText('staff@ocula.test')).toBeInTheDocument();
    expect(screen.getByText('MRB Optical Clinic Pasay')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change password' })).toHaveAttribute(
      'href',
      '/staff/change-password',
    );
  });

  it('patients have no branches row', () => {
    renderWithProviders(<SettingsPage />, { user: fakeUser({ role: 'patient' }) });
    expect(screen.queryByText('Branches')).toBeNull();
  });
});
