import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { landingFor } from '@/features/auth/useLoginForm';
import { fakeUser, renderWithProviders } from '@/test/render';

// Shows where the visitor ended up, and the return page that came with them.
function Landing({ name }: { name: string }) {
  const from = (useLocation().state as { from?: string } | null)?.from;
  return <p>{`${name} ${from ?? ''}`.trim()}</p>;
}

const routes = (
  <Routes>
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<Landing name="login" />} />
    <Route path="/me" element={<Landing name="patient home" />} />
    <Route path="/me/appointments" element={<Landing name="my appointments" />} />
  </Routes>
);
const fromBooking = { pathname: '/register', state: { from: '/me/appointments' } };

const phone = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

describe('where a patient lands after signing in', () => {
  it('goes back to the page that sent them, when it is in their own area', () => {
    expect(landingFor('patient', '/me/appointments')).toBe('/me/appointments');
    expect(landingFor('staff', '/staff/billing')).toBe('/staff/billing');
  });

  it('goes to their own home when there is no page, or it is in someone else’s area', () => {
    expect(landingFor('patient', undefined)).toBe('/me');
    expect(landingFor('patient', '/staff/patients')).toBe('/me');
  });
});

describe('Register', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends someone who is already signed in back to where they were going', () => {
    renderWithProviders(routes, { user: fakeUser({ role: 'patient' }), route: fromBooking });
    expect(screen.getByText('my appointments')).toBeInTheDocument();
  });

  it('sends someone who is already signed in to their home when they came from nowhere', () => {
    renderWithProviders(routes, { user: fakeUser({ role: 'patient' }), route: '/register' });
    expect(screen.getByText('patient home')).toBeInTheDocument();
  });

  it('keeps the return page when the visitor chooses "Log In" instead', async () => {
    renderWithProviders(routes, { route: fromBooking });
    await userEvent.click(screen.getByRole('link', { name: 'Log In' }));
    expect(screen.getByText('login /me/appointments')).toBeInTheDocument();
  });

  it('keeps the return page on a phone too', async () => {
    phone();
    renderWithProviders(routes, { route: fromBooking });
    await userEvent.click(screen.getByRole('link', { name: 'Log In' }));
    expect(screen.getByText('login /me/appointments')).toBeInTheDocument();
  });

  it('after registering, lands on the page the visitor came for', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(routes, { route: fromBooking, auth: { register } });
    await userEvent.type(screen.getByLabelText('Full Name'), 'Maria Santos');
    await userEvent.type(screen.getByLabelText('Email Address'), 'maria@example.com');
    await userEvent.type(screen.getByLabelText('Contact Number'), '9171234567');
    await userEvent.type(screen.getByLabelText('Date of Birth'), '01/15/1990');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('my appointments')).toBeInTheDocument();
    expect(register).toHaveBeenCalledOnce();
  });
});
