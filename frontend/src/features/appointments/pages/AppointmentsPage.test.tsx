import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoToastHost } from '@/components/common/UndoToast';
import { AppointmentsPage } from '@/features/appointments/pages/AppointmentsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// One patient per test: the visits live in memory for the whole file.
vi.mock('@/mocks/data/samples', () => {
  const v = (id: string, patient: string, time: string) => ({
    id,
    patient,
    day: '2026-11-26',
    time,
    service: 'Eye exam',
    doctor: null,
    status: 'Booked',
  });
  return {
    openSlots: [],
    doctors: [],
    patients: [
      {
        id: 'P-001245',
        name: 'Ana Reyes',
        phone: '0917 555 0142',
        lastVisit: '2026-10-01',
        nextRecall: null,
        branch: 'Pasay',
        balance: 0,
      },
    ],
    agenda: [
      v('a1', 'Checkin Patient', '9:00 AM'),
      v('a2', 'Undo Patient', '10:00 AM'),
      v('a3', 'Exam Patient', '11:00 AM'),
      v('a4', 'Cancel Patient', '1:00 PM'),
      v('a5', 'Noshow Patient', '2:00 PM'),
      v('a6', 'Taken Patient', '4:00 PM'),
    ],
  };
});

// The page, the Undo message the shell would show, and a stand-in for the patients screen so a
// jump there can be seen.
function renderPage() {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/staff/appointments" element={<AppointmentsPage />} />
        <Route path="/staff/patients" element={<p>Patients screen</p>} />
      </Routes>
      <UndoToastHost />
    </>,
    { user: fakeUser({ role: 'staff' }), route: '/staff/appointments' },
  );
}
const row = (name: string) => screen.getByText(name).closest('li') as HTMLElement;
const click = (name: string | RegExp, within_?: HTMLElement) =>
  userEvent.click(within(within_ ?? document.body).getByRole('button', { name }));

// "Now" is Thursday 26 Nov 2026, 3:00 PM in Manila.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-26T07:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('Appointments (staff)', () => {
  it('checking in marks the visit Waiting, starts the wait and offers Start exam', async () => {
    renderPage();
    await click(/Check in/, row('Checkin Patient'));
    const r = row('Checkin Patient');
    expect(within(r).getByText('Waiting')).toBeInTheDocument();
    expect(within(r).getByText('Just checked in')).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: /Start exam/ })).toBeInTheDocument();
  });

  it('Undo takes a check-in back', async () => {
    renderPage();
    await click(/Check in/, row('Undo Patient'));
    expect(screen.getByRole('status')).toHaveTextContent('Undo Patient checked in');
    await click('Undo');
    const r = row('Undo Patient');
    expect(within(r).getByText('Booked')).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: /Check in/ })).toBeInTheDocument();
  });

  it('Start exam only changes the status: it stays on the page and offers Open records', async () => {
    renderPage();
    await click(/Check in/, row('Exam Patient'));
    await click(/Start exam/, row('Exam Patient'));
    const r = row('Exam Patient');
    expect(within(r).getByText('In exam')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Appointments' })).toBeInTheDocument();
    expect(screen.queryByText('Patients screen')).not.toBeInTheDocument();
    expect(within(r).getByRole('link', { name: /Open records/ })).toHaveAttribute(
      'href',
      '/staff/patients?q=Exam%20Patient',
    );
  });

  it('cancelling from the row menu takes the visit off the list', async () => {
    renderPage();
    await click('More actions for Cancel Patient');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cancel visit' }));
    expect(screen.queryByText('Cancel Patient')).not.toBeInTheDocument();
  });

  it('marking a no-show shows the visit as No-show', async () => {
    renderPage();
    await click('More actions for Noshow Patient');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mark no-show' }));
    expect(within(row('Noshow Patient')).getByText('No-show')).toBeInTheDocument();
  });
});

describe('Booking from the staff Appointments page', () => {
  async function chooseAna() {
    await click(/Book a visit/);
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Search patients'), 'ana');
    await userEvent.click(within(dialog).getByRole('button', { name: /Ana Reyes/ }));
    return dialog;
  }

  it('shows a taken time as booked and does not let it be picked', async () => {
    renderPage();
    const dialog = await chooseAna();
    expect(within(dialog).queryByRole('button', { name: '4:00 PM' })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('4:00 PM, booked by Taken Patient')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '4:30 PM' })).toBeEnabled();
  });

  it('a booked visit appears in the list, ready to check in', async () => {
    renderPage();
    const dialog = await chooseAna();
    await userEvent.click(within(dialog).getByRole('button', { name: '4:30 PM' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /^Book visit/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const r = row('Ana Reyes');
    expect(within(r).getByText('Booked')).toBeInTheDocument();
    expect(within(r).getByText('4:30 PM')).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: /Check in/ })).toBeInTheDocument();
  });

  it('cannot be booked without a patient', async () => {
    renderPage();
    await click(/Book a visit/);
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: '5:30 PM' }));
    expect(within(dialog).getByRole('button', { name: /^Book visit/ })).toBeDisabled();
  });
});
