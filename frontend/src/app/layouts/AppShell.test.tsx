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
    expect(within(nav).getByRole('link', { name: 'Patients' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Job orders' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'EOD Report' })).toBeNull();
    expect(within(nav).queryByRole('link', { name: 'Users' })).toBeNull();
    // Staff reach Settings and Sign Out from the account menu, not the sidebar.
    expect(within(nav).queryByRole('link', { name: 'Settings' })).toBeNull();
  });

  it('staff: the sidebar ends with a branch card instead of Settings and Sign Out', () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    expect(screen.getByText('MRB Optical Clinic')).toBeInTheDocument();
    expect(screen.getByText('Pasay branch')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign Out' })).toBeNull();
  });

  it('staff: the menu is grouped as Clinic, Operations and Tools, with an icon only on Dashboard', () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    const nav = mainNav();
    ['Clinic', 'Operations', 'Tools'].forEach((group) => {
      expect(within(nav).getByText(group)).toBeInTheDocument();
    });
    expect(nav.querySelectorAll('a svg')).toHaveLength(1); // only Dashboard has an icon
    expect(
      within(nav).getByRole('link', { name: 'Dashboard' }).querySelector('svg'),
    ).not.toBeNull();
    expect(within(nav).getByRole('link', { name: 'Patients' }).querySelector('svg')).toBeNull();
  });

  it('other roles keep a flat menu with no group names', () => {
    renderShell(fakeUser({ role: 'optometrist', branches: [PASAY] }), '/doctor');
    const nav = mainNav();
    expect(within(nav).queryByText('Clinic')).toBeNull();
    expect(within(nav).getAllByRole('link').length).toBeGreaterThan(4);
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

  it('shows staff their single branch as a pill, with no picker', () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    expect(screen.queryByRole('combobox', { name: 'Branch' })).toBeNull();
    expect(screen.getByText('MRB Optical · Pasay')).toBeInTheDocument();
  });

  it('shows a doctor with a single branch nothing in the top bar', () => {
    renderShell(fakeUser({ role: 'optometrist', branches: [PASAY] }), '/doctor');
    expect(screen.queryByRole('combobox', { name: 'Branch' })).toBeNull();
    expect(screen.queryByText('MRB Optical · Pasay')).toBeNull();
  });
});

describe('AppShell page title', () => {
  it('puts the page name in the browser tab so screen readers and history say where you are', () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff/patients');
    expect(document.title).toBe('Patients · OCULA');
  });
});

describe('AppShell staff top bar', () => {
  it('has no search box: searching patients lives on the Patient records page', () => {
    const { unmount } = renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    expect(screen.queryByRole('searchbox')).toBeNull();
    unmount();
    renderShell(fakeUser({ role: 'optometrist', branches: [PASAY] }), '/doctor');
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('shows no role line anywhere: not on the account button and not in the menu', async () => {
    renderShell(fakeUser({ role: 'staff', fullName: 'Sam Staff', branches: [PASAY] }), '/staff');
    const button = screen.getByRole('button', { name: 'Account menu' });
    expect(button).toHaveTextContent('Sam Staff');
    expect(screen.queryByText('Clinic staff')).toBeNull();
    await userEvent.setup().click(button);
    await screen.findByRole('menu');
    expect(screen.queryByText(/Clinic staff/)).toBeNull();
  });
});

describe('AppShell account', () => {
  it('the account menu has Settings and Sign Out, and nothing else', async () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((i) => i.textContent?.trim())).toEqual(['Settings', 'Sign out']);
    expect(items[0]).toHaveAttribute('href', '/staff/settings');
  });

  it('the account menu has a Dark mode switch between Settings and Sign out', async () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    const dark = await screen.findByRole('menuitemcheckbox', { name: 'Dark mode' });
    const items = screen.getByRole('menu').querySelectorAll('[role^="menuitem"]');
    const order = [...items].map((i) => i.textContent?.trim());
    expect(order).toEqual(['Settings', 'Dark mode', 'Sign out']);
    expect(dark).toHaveAttribute('aria-checked', 'false');
  });

  it('turning Dark mode on darkens the app, is remembered, and keeps the menu open', async () => {
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('ocula-theme')).toBe('dark');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Dark mode' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Dark mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('ocula-theme')).toBe('light');
  });

  it('starts dark when it was saved dark, and the light pages are not left dark', () => {
    localStorage.setItem('ocula-theme', 'dark');
    const { unmount } = renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff');
    expect(document.documentElement).toHaveClass('dark');
    unmount();
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('the account menu starts with who is signed in: name and email', async () => {
    renderShell(
      fakeUser({
        role: 'staff',
        fullName: 'Sam Staff',
        email: 'staff@ocula.test',
        branches: [PASAY],
      }),
      '/staff',
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Account menu' }));
    const header = await screen.findByText('staff@ocula.test');
    const card = header.parentElement as HTMLElement;
    expect(within(card).getByText('Sam Staff')).toBeInTheDocument();
    expect(within(card).getByText('staff@ocula.test')).toBeInTheDocument();
  });

  it('the account menu Sign Out logs out and goes to the login page', async () => {
    const logout = vi.fn(async () => undefined);
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff', { logout });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('the sidebar Sign Out (doctors) logs out and goes to the login page', async () => {
    const logout = vi.fn(async () => undefined);
    renderShell(fakeUser({ role: 'optometrist', branches: [PASAY] }), '/doctor', { logout });
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

  it('staff: the page name sits in the top bar next to the menu button, and there is no search', () => {
    usePhoneScreen();
    renderShell(fakeUser({ role: 'staff', branches: [PASAY] }), '/staff/patients');
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getByText('Patients', { selector: 'p' })).toBeInTheDocument();
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
