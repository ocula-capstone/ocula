import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyAppointmentsPage } from '@/features/appointments/pages/MyAppointmentsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// Each test has its own patient: the visits live in memory for the whole file, so sharing a
// patient would let one test change what the next one sees. Days are in 2027, always upcoming
// and inside the calendar's range.
vi.mock('@/mocks/data/samples', () => {
  const v = (
    id: string,
    patient: string,
    day: string,
    time: string,
    service: string,
    status = 'Booked',
  ) => ({
    id,
    patient,
    day,
    time,
    service,
    doctor: null,
    status,
  });
  return {
    openSlots: [],
    doctors: [],
    patients: [],
    agenda: [
      v('c1', 'Capped Patient', '2027-03-01', '9:00 AM', 'Eye exam'),
      v('c2', 'Capped Patient', '2027-03-02', '9:00 AM', 'Frame fitting'),
      v('c3', 'Capped Patient', '2027-03-03', '9:00 AM', 'Glasses pickup', 'Cancelled'),
      v('o1', 'Test User', '2027-03-01', '10:00 AM', 'Eye exam'),
      v('x1', 'Cancel Patient', '2027-03-01', '9:00 AM', 'Eye exam'),
      v('x2', 'Cancel Patient', '2027-03-02', '9:00 AM', 'Frame fitting'),
      v('m1', 'Move Patient', '2027-03-01', '9:00 AM', 'Eye exam'),
    ],
  };
});

const patient = (fullName: string) => fakeUser({ role: 'patient', fullName });
const open = () => userEvent.click(screen.getByRole('button', { name: /Book a visit/ }));

// "Now" is Thursday 26 Nov 2026, 3:00 PM in Manila.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-26T07:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('My appointments', () => {
  it('shows only the patient’s own visits, as Confirmed, and hides cancelled ones', () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Capped Patient') });
    expect(screen.getByText('Eye exam', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText('Frame fitting', { selector: 'p' })).toBeInTheDocument();
    expect(screen.queryByText('Glasses pickup', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Confirmed')).toHaveLength(2);
  });

  it('at the limit, explains why and does not open the booking box', async () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Capped Patient') });
    expect(screen.getByRole('status')).toHaveTextContent(/2 upcoming visits/);
    await open();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('under the limit, opens the booking box with the patient’s name fixed', async () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Test User') });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Your visit is confirmed as soon as you book.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });

  it('cancelling a visit frees a place, so the patient can book again', async () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Cancel Patient') });
    expect(screen.getByRole('status')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Cancel Frame fitting/ }));
    expect(screen.queryByText('Frame fitting', { selector: 'p' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('rescheduling moves the visit to the new time instead of adding another', async () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Move Patient') });
    await userEvent.click(screen.getByRole('button', { name: /Reschedule Eye exam/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Reschedule visit')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '11:00 AM' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /^Save new time/ }));
    expect(screen.getByText(/11:00 AM/)).toBeInTheDocument();
    expect(screen.queryByText(/ 9:00 AM/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Confirmed')).toHaveLength(1);
  });

  it('booking confirms at once and lists the visit under Upcoming', async () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Book Patient') });
    expect(screen.getByText('No visits yet')).toBeInTheDocument();
    await open();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '4:00 PM' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /^Book visit/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/Thu, Nov 26 · 4:00 PM/)).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('does not let a patient pick a time that has already passed today', async () => {
    renderWithProviders(<MyAppointmentsPage />, { user: patient('Past Patient') });
    await open();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '2:30 PM' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '3:30 PM' })).toBeEnabled();
  });
});
