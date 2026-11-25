import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/app/layouts/AppShell';
import type { AuthContextValue } from '@/features/auth/auth-context';
import { fakeUser, renderWithProviders } from '@/test/render';
import type { AuthUser } from '@/types/auth';

const PASAY = { id: 'b-pasay', code: 'PASAY', name: 'MRB Optical Clinic Pasay' };
const TAGUIG = { id: 'b-taguig', code: 'TAGUIG', name: 'MRB Optical Clinic Taguig' };

// Mounts the shell under every role's area, with a stand-in page inside it.
function renderShell(user: AuthUser, route: string, auth?: Partial<AuthContextValue>) {
  return renderWithProviders(
    <Routes>
      {['/staff', '/doctor', '/admin', '/me'].map((base) => (
        <Route key={base} path={base} element={<AppShell />}>
          <Route index element={<p>Home page</p>} />
          <Route path="*" element={<p>Inner page</p>} />
        </Route>
      ))}
      <Route path="/login" element={<p>Login page</p>} />
    </Routes>,
    { user, route, auth },
  );
}

const mainNav = () => screen.getByRole('navigation', { name: 'Main' });

// Pretends the screen is phone-sized: no min-width query matches.
function usePhoneScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('AppShell menus', () => {
  it('staff: marks the current page and hides other roles’ items', () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff/patients');
    const nav = mainNav();
    expect(within(nav).getByRole('link', { name: 'Patient Records' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Job Orders' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'EOD Report' })).toBeNull();
    expect(within(nav).queryByRole('link', { name: 'Users' })).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/staff/settings',
    );
  });

  it('doctor: has EOD Report and Inventory, not Billing; Dashboard is current at /doctor', () => {
    renderShell(fakeUser({ role: 'optometrist', branches: [PASAY] }), '/doctor');
    const nav = mainNav();
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'EOD Report' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Inventory' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Billing' })).toBeNull();
  });

  it('admin: has Users, not Billing', () => {
    renderShell(fakeUser({ role: 'admin', branches: [PASAY, TAGUIG] }), '/admin');
    const nav = mainNav();
    expect(within(nav).getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Billing' })).toBeNull();
  });
});

describe('AppShell branches', () => {
  it('shows a notice instead of the page when staff has no branch', () => {
    renderShell(fakeUser({ role: 'staff', branches: [] }), '/staff/patients');
    expect(screen.getByText('No branch assigned')).toBeInTheDocument();
    expect(screen.queryByText('Inner page')).toBeNull();
  });

  it('still lets someone with no branch change a temporary password', () => {
    renderShell(fakeUser({ role: 'staff', branches: [] }), '/staff/change-password');
    expect(screen.getByText('Inner page')).toBeInTheDocument();
  });

  it('offers a branch picker only to people with several branches', async () => {
    renderShell(fakeUser({ role: 'optometrist', branches: [PASAY, TAGUIG] }), '/doctor');
    const picker = screen.getByRole('combobox', { name: 'Branch' });
    await userEvent.setup().selectOptions(picker, 'MRB Optical Clinic Taguig');
    expect(picker).toHaveValue('b-taguig');
  });

  it('shows no branch name or picker to someone with a single branch', () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    expect(screen.queryByRole('combobox', { name: 'Branch' })).toBeNull();
    expect(screen.queryByText('MRB Optical Clinic Pasay')).toBeNull();
  });
});

describe('AppShell account', () => {
  it('account menu links to change password', async () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    expect(await screen.findByRole('menuitem', { name: 'Change password' })).toHaveAttribute(
      'href',
      '/staff/change-password',
    );
  });

  it('Sign Out logs out and goes to the login page', async () => {
    const logout = vi.fn(async () => undefined);
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff', { logout });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });
});

describe('AppShell on a phone', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('staff: the menu button opens the drawer with the menu', async () => {
    usePhoneScreen();
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open menu' }));
    expect(
      within(await screen.findByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: 'Billing',
      }),
    ).toBeInTheDocument();
  });

  it('patient: a bottom bar with four tabs and no branch picker', () => {
    usePhoneScreen();
    renderShell(fakeUser({ role: 'patient', branches: [] }), '/me/records');
    const nav = mainNav();
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Dashboard',
      'My Records',
      'Frame Finder',
      'Settings',
    ]);
    expect(within(nav).getByRole('link', { name: 'My Records' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.queryByRole('combobox', { name: 'Branch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Open menu' })).toBeNull();
  });
});
