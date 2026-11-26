import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UndoToastHost } from '@/components/common/UndoToast';
import { AppointmentsPage } from '@/features/appointments/pages/AppointmentsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// One patient per test: the visits live in memory for the whole file.
vi.mock('@/mocks/data/samples', () => {
  const v = (
    id: string,
    patient: string,
    time: string,
    day = '2026-11-26',
    extra: Record<string, unknown> = {},
  ) => ({
    id,
    patient,
    day,
    time,
    service: 'Eye exam',
    doctor: null,
    status: 'Booked',
    ...extra,
  });
  return {
    openSlots: [{ id: 's1', day: '2026-11-26', time: '12:30 PM', minutes: 30 }],
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
      v('a7', 'Tomorrow Patient', '11:00 AM', '2026-11-27'),
      v('a8', 'Later Patient', '11:00 AM', '2026-11-30'),
      v('a9', 'Finished Patient', '8:00 AM', '2026-11-26', { status: 'Done' }),
      v('b1', 'Menu Booked', '1:30 PM'),
      v('b2', 'Early Patient', '3:10 PM'),
      v('b3', 'Menu Waiting', '11:30 AM', '2026-11-26', {
        status: 'Waiting',
        waitingSince: '2026-11-26T06:43:00Z',
        note: 'JO #1038',
      }),
      v('b4', 'Menu Exam', '10:30 AM', '2026-11-26', { status: 'In exam' }),
      v('b5', 'Menu Cancelled', '12:30 PM', '2026-11-26', {
        status: 'Cancelled',
        cancelledBy: 'patient',
        cancelledOn: '2026-11-25',
      }),
      v('b6', 'Menu Missed', '9:30 AM', '2026-11-26', { status: 'No-show', patientId: 'P-77' }),
      v('b7', 'Repeat Patient', '12:00 PM', '2026-11-26', { status: 'No-show', patientId: 'P-88' }),
      v('b8', 'Repeat Patient', '9:00 AM', '2026-11-20', { status: 'No-show', patientId: 'P-88' }),
      v('c1', 'UndoIn Seed', '8:30 AM', '2026-11-26', {
        status: 'Waiting',
        waitingSince: '2026-11-26T06:50:00Z',
      }),
      v('c2', 'UndoStart Seed', '8:45 AM', '2026-11-26', { status: 'In exam' }),
      v('c3', 'Reopen Seed', '7:30 AM', '2026-11-26', { status: 'Done' }),
      v('c4', 'Restore Seed', '7:00 AM', '2026-11-26', {
        status: 'Cancelled',
        cancelledBy: 'clinic',
        cancelledOn: '2026-11-24',
      }),
      v('c5', 'Recall Seed', '6:30 AM', '2026-11-26', { status: 'No-show' }),
      v('c6', 'Dialog Patient', '5:00 PM'),
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
const row = (name: string) => screen.getByText(name).closest('[role="row"]') as HTMLElement;
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
    expect(within(r).getByText(/Just checked in/)).toBeInTheDocument();
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

  it('cancelling asks why, then moves the visit under Not attending with who cancelled', async () => {
    renderPage();
    await click('More actions for Dialog Patient');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cancel visit' }));
    const dialog = await screen.findByRole('dialog');
    for (const reason of ['Patient asked', 'Clinic had to', 'Other']) {
      expect(within(dialog).getByRole('radio', { name: reason })).toBeInTheDocument();
    }
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Patient asked' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel visit' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const r = row('Dialog Patient');
    expect(within(r).getByText('Cancelled')).toBeInTheDocument();
    expect(within(r).getByText(/Cancelled by patient, Nov 26/)).toBeInTheDocument();
    expect(within(r).getByRole('button', { name: /Rebook/ })).toBeInTheDocument();
  });

  it('the cancel dialog needs a reason before it can be confirmed, and can be backed out of', async () => {
    renderPage();
    await click('More actions for Cancel Patient');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Cancel visit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Cancel visit' })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep visit' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(within(row('Cancel Patient')).getByText('Booked')).toBeInTheDocument();
  });

  it('marking a no-show is one tap, shows No-show, and can be undone', async () => {
    renderPage();
    await click('More actions for Noshow Patient');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mark as no-show' }));
    expect(within(row('Noshow Patient')).getByText('No-show')).toBeInTheDocument();
    await click('Undo');
    expect(within(row('Noshow Patient')).getByText('Booked')).toBeInTheDocument();
  });
});

describe('Appointments table', () => {
  const menuItems = async (patient: string) => {
    await click(`More actions for ${patient}`);
    const items = (await screen.findAllByRole('menuitem')).map((i) => i.textContent);
    await userEvent.keyboard('{Escape}');
    return items;
  };

  it('is a table with Time, Patient, Doctor and Status column headings', () => {
    renderPage();
    const table = screen.getAllByRole('table')[0];
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(expect.arrayContaining(['Time', 'Patient', 'Doctor', 'Status']));
  });

  it('groups today’s visits: needs attention now, in exam, later today, done, not attending', () => {
    renderPage();
    for (const title of [
      /^Needs attention now · \d+$/,
      /^In exam · \d+$/,
      /^Later today · \d+$/,
      /^Done · \d+$/,
      /^Not attending · \d+$/,
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  it('keeps Done folded away until Show is pressed', async () => {
    renderPage();
    expect(screen.queryByText('Finished Patient')).toBeNull();
    await click('Show');
    expect(screen.getByText('Finished Patient')).toBeInTheDocument();
    expect(within(row('Finished Patient')).getByText('Done')).toBeInTheDocument();
    await click('Hide');
    expect(screen.queryByText('Finished Patient')).toBeNull();
  });

  it('writes the status as one plain word, with the wait and job order under the name', () => {
    renderPage();
    const r = row('Menu Waiting');
    expect(within(r).getByText('Waiting').textContent).toBe('Waiting');
    expect(within(r).getByText(/Eye exam · JO #1038 · Waiting \d+ min/)).toBeInTheDocument();
  });

  it('shows who cancelled and when, and offers Rebook for cancelled and missed visits', () => {
    renderPage();
    const cancelled = row('Menu Cancelled');
    expect(within(cancelled).getByText('Cancelled', { selector: 'span' })).toBeInTheDocument();
    expect(
      within(cancelled).getByText('Eye exam · Cancelled by patient, Nov 25'),
    ).toBeInTheDocument();
    expect(within(cancelled).getByRole('button', { name: /Rebook/ })).toBeInTheDocument();
    const missed = row('Menu Missed');
    expect(within(missed).getByText('No-show')).toBeInTheDocument();
    expect(within(missed).getByRole('button', { name: /Rebook/ })).toBeInTheDocument();
  });

  it('labels a patient with two or more no-shows, and only then', () => {
    renderPage();
    expect(within(row('Repeat Patient')).getByText('2 no-shows')).toBeInTheDocument();
    expect(within(row('Menu Missed')).queryByText(/no-shows?$/)).toBeNull();
  });

  it('gives each status its own main action', () => {
    renderPage();
    expect(
      within(row('Menu Booked')).getByRole('button', { name: /Check in/ }),
    ).toBeInTheDocument();
    expect(
      within(row('Menu Waiting')).getByRole('button', { name: /Start exam/ }),
    ).toBeInTheDocument();
    expect(
      within(row('Menu Exam')).getByRole('link', { name: /Open records/ }),
    ).toBeInTheDocument();
  });

  it('every row has a "more actions" menu named for its patient', () => {
    renderPage();
    for (const name of [
      'Menu Booked',
      'Menu Waiting',
      'Menu Exam',
      'Menu Cancelled',
      'Menu Missed',
    ]) {
      expect(screen.getByRole('button', { name: `More actions for ${name}` })).toBeInTheDocument();
    }
  });

  it('the menus offer the right choices for each status, with the risky ones last', async () => {
    renderPage();
    expect(await menuItems('Menu Booked')).toEqual([
      'Reschedule',
      'Open patient record',
      'Mark as no-show',
      'Cancel visit',
    ]);
    expect(await menuItems('Early Patient')).toEqual([
      'Reschedule',
      'Open patient record',
      'Cancel visit',
    ]);
    expect(await menuItems('Menu Waiting')).toEqual([
      'Open patient record',
      'Undo check-in',
      'Cancel visit',
    ]);
    expect(await menuItems('Menu Exam')).toEqual(['Open patient record', 'Undo start']);
    expect(await menuItems('Menu Cancelled')).toEqual(['Open patient record', 'Restore visit']);
    expect(await menuItems('Menu Missed')).toEqual([
      'Open patient record',
      'Restore visit',
      'Add to recalls',
    ]);
    await click('Show');
    expect(await menuItems('Finished Patient')).toEqual(['Open patient record', 'Reopen visit']);
  });

  it('Undo check-in, Undo start, Reopen and Restore each move the visit one step back', async () => {
    renderPage();
    const pick = async (patient: string, item: string) => {
      await click(`More actions for ${patient}`);
      await userEvent.click(await screen.findByRole('menuitem', { name: item }));
    };
    await pick('UndoIn Seed', 'Undo check-in');
    expect(within(row('UndoIn Seed')).getByText('Booked')).toBeInTheDocument();
    await pick('UndoStart Seed', 'Undo start');
    expect(within(row('UndoStart Seed')).getByText('Waiting')).toBeInTheDocument();
    await pick('Restore Seed', 'Restore visit');
    expect(within(row('Restore Seed')).getByText('Booked')).toBeInTheDocument();
    await click('Show');
    await pick('Reopen Seed', 'Reopen visit');
    expect(within(row('Reopen Seed')).getByText('In exam')).toBeInTheDocument();
  });

  it('Add to recalls says so', async () => {
    renderPage();
    await click('More actions for Recall Seed');
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Add to recalls' }));
    expect(screen.getByRole('status')).toHaveTextContent('Recall Seed added to recalls');
  });

  it('says how many visits there are today and how many did not happen', () => {
    renderPage();
    expect(
      screen.getByText(/^Showing all \d+ visits today, plus \d+ that did not happen\.$/),
    ).toBeInTheDocument();
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

describe('Date filter on the staff Appointments page', () => {
  const openDate = () => userEvent.click(screen.getByRole('button', { name: /^Date/ }));
  const inPicker = () => within(screen.getByRole('dialog'));
  const quick = (name: string) => userEvent.click(inPicker().getByRole('button', { name }));

  it('opens with nothing picked, listing the next 7 days', async () => {
    renderPage();
    expect(screen.getByText('Later Patient')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Date\s*Select/ })).toBeInTheDocument();
    await openDate();
    expect(inPicker().getByRole('button', { name: 'Next 7 days' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('lets several quick choices be ticked together, and lists the visits from all of them', async () => {
    renderPage();
    await openDate();
    await quick('Today');
    await quick('Tomorrow');
    expect(screen.getByText('Checkin Patient')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow Patient')).toBeInTheDocument();
    expect(screen.queryByText('Later Patient')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Date\s*Today, Tomorrow/ })).toBeInTheDocument();
  });

  it('unticking a quick choice takes its days off the list', async () => {
    renderPage();
    await openDate();
    await quick('Today');
    await quick('Tomorrow');
    await quick('Tomorrow');
    expect(screen.queryByText('Tomorrow Patient')).not.toBeInTheDocument();
    expect(screen.getByText('Checkin Patient')).toBeInTheDocument();
  });

  it('combines a quick choice with a day picked on the calendar', async () => {
    renderPage();
    await openDate();
    await quick('Today');
    await userEvent.click(inPicker().getByRole('button', { name: /November 30/ }));
    expect(screen.getByText('Checkin Patient')).toBeInTheDocument();
    expect(screen.getByText('Later Patient')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow Patient')).not.toBeInTheDocument();
  });

  it('Clear all appears once the date is changed, and empties the Date filter', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    await openDate();
    await quick('Today');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Later Patient')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(screen.getByText('Later Patient')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    // The date filter is empty again, not still on some choice.
    expect(screen.getByRole('button', { name: /^Date\s*Select/ })).toBeInTheDocument();
    await openDate();
    expect(inPicker().getByRole('button', { name: 'Today' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('Appointments search and filter card', () => {
  const search = () => screen.getByRole('searchbox', { name: 'Search appointments' });
  const count = (pattern: RegExp) =>
    screen.getByText((_, el) => el?.tagName === 'P' && pattern.test(el.textContent ?? ''));

  it('has a search box above the labelled filters Date, Doctor and Status, and no "Filters" heading', () => {
    renderPage();
    expect(search()).toBeInTheDocument();
    for (const label of ['Date', 'Doctor', 'Status']) {
      expect(screen.getByText(label, { selector: 'span' })).toBeInTheDocument();
    }
    expect(screen.getByRole('group', { name: 'Range' })).toBeInTheDocument();
    expect(screen.queryByText('Filters')).toBeNull();
  });

  it('searching narrows the list by patient, and the count says how many of all', async () => {
    renderPage();
    expect(count(/^Showing \d+ of \d+ visits/)).toBeInTheDocument();
    await userEvent.type(search(), 'noshow');
    expect(screen.getByText('Noshow Patient')).toBeInTheDocument();
    expect(screen.queryByText('Checkin Patient')).toBeNull();
    expect(count(/^Showing 1 of \d+ visits/)).toBeInTheDocument();
  });

  it('Clear all shows for a search too, and clears it', async () => {
    renderPage();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    await userEvent.type(search(), 'noshow');
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(search()).toHaveValue('');
    expect(screen.getByText('Checkin Patient')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  });
});

describe('Open slots', () => {
  const pickToday = async () => {
    await userEvent.click(screen.getByRole('button', { name: /^Date/ }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^Today$/ }),
    );
    await userEvent.keyboard('{Escape}');
  };

  it('are not in a long list, only when one day is on screen', async () => {
    renderPage();
    expect(screen.queryByText(/Open slot/)).toBeNull();
    await pickToday();
    // Cancelling in earlier tests frees more times, so there may be several.
    expect(screen.getAllByText('Open slot · 30 min').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Book 12:30 PM' })).toBeInTheDocument();
  });

  it('are hidden again while a search narrows the list', async () => {
    renderPage();
    await pickToday();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search appointments' }), 'taken');
    expect(screen.queryByText(/Open slot/)).toBeNull();
  });
});
