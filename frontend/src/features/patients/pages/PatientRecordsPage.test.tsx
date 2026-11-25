import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PatientRecordsPage } from '@/features/patients/pages/PatientRecordsPage';
import { fakeUser, renderWithProviders } from '@/test/render';

// Today is fixed so "Today", "3 weeks overdue" and "Due today" do not drift.
vi.mock('@/lib/dates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dates')>()),
  manilaToday: () => '2026-11-25',
}));

// Built before the mock below runs (vi.mock is hoisted above ordinary code).
const { p } = vi.hoisted(() => ({
  p: (
    n: number,
    name: string,
    branch: 'Pasay' | 'Taguig',
    lastVisit: string,
    nextRecall: string | null,
    balance = 0,
  ) => ({
    id: `P-${String(n).padStart(6, '0')}`,
    name,
    phone: `0917 555 ${String(n).padStart(4, '0')}`,
    lastVisit,
    nextRecall,
    branch,
    balance,
  }),
}));

// 25 people: 21 Pasay, 4 Taguig. Overdue: Carlo, Jun. Due today: Fe. Owe money: Dina, Gio.
// The last 15 ("Filler") are old visits with no recall, so they sort last and fill page 2 and 3.
vi.mock('@/mocks/data/samples', () => ({
  patients: [
    p(1, 'Ana Reyes', 'Pasay', '2026-11-25', '2027-11-10'),
    p(2, 'Bea Cruz', 'Pasay', '2026-11-25', '2027-05-10'),
    p(3, 'Carlo Santos', 'Pasay', '2025-10-14', '2026-11-04'),
    p(4, 'Dina Tan', 'Taguig', '2026-11-20', '2027-11-01', 3200),
    p(5, 'Eli Lim', 'Taguig', '2026-11-18', '2027-05-02'),
    p(6, 'Fe Mendoza', 'Pasay', '2026-05-25', '2026-11-25'),
    p(7, 'Gio Garcia', 'Pasay', '2026-11-11', '2027-11-05', 3250),
    p(8, 'Hana Villanueva', 'Taguig', '2026-10-30', '2027-10-09'),
    p(9, 'Ian Ong', 'Pasay', '2026-10-01', '2027-09-01'),
    p(10, 'Jun Aquino', 'Taguig', '2026-09-01', '2026-11-20'),
    ...Array.from({ length: 15 }, (_, i) =>
      p(11 + i, `Filler ${String(i + 1).padStart(2, '0')}`, 'Pasay', '2024-01-01', null),
    ),
  ],
}));

const staff = fakeUser({ role: 'staff' });
const render = (user = staff) =>
  renderWithProviders(<PatientRecordsPage />, { user, route: '/staff/patients' });
const bodyRows = () => screen.getAllByRole('row').slice(1);
const names = () => bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent ?? '');
const menu = (name: RegExp) => screen.getByRole('button', { name });

// Opens a filter menu, picks one option, and leaves the menu open (multi-select stays open).
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  trigger: RegExp,
  option: RegExp,
  kind: 'menuitemcheckbox' | 'menuitemradio' = 'menuitemcheckbox',
) {
  await user.click(menu(trigger));
  await user.click(await screen.findByRole(kind, { name: option }));
}

describe('Patient records header and filter bar', () => {
  it('shows the title and head count', () => {
    render();
    expect(screen.getByRole('heading', { level: 1, name: 'Patient records' })).toBeInTheDocument();
    expect(screen.getByText('25 patients across Pasay and Taguig')).toBeInTheDocument();
  });

  it('has the Filters bar with Branch, Status and Last visit, and Sort by', () => {
    render();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    // Nothing is picked until the user picks it: no default value is shown.
    expect(menu(/^Branch\s*Select/)).toBeInTheDocument();
    expect(menu(/^Status\s*Select/)).toBeInTheDocument();
    expect(menu(/^Last visit\s*Select/)).toBeInTheDocument();
    expect(menu(/^Sort by\s*Select/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
  });

  it('the "all" choices are options in each menu, and picking one shows it without filtering', async () => {
    render();
    const user = userEvent.setup();
    await user.click(menu(/^Branch/));
    expect((await screen.findAllByRole('menuitemcheckbox')).map((o) => o.textContent)).toEqual([
      'All branches 25',
      'Pasay 21',
      'Taguig 4',
    ]);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'All branches 25' }));
    expect(menu(/^Branch\s*All branches/)).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(menu(/^Status/));
    expect((await screen.findAllByRole('menuitemcheckbox'))[0]).toHaveTextContent('Any status');
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Any status' }));
    expect(menu(/^Status\s*Any status/)).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(menu(/^Last visit/));
    await user.click(await screen.findByRole('button', { name: 'Any time' }));
    expect(menu(/^Last visit\s*Any time/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
  });

  it('Branch lets you pick several branches; All branches replaces them, and unticking all returns to Select', async () => {
    render();
    const user = userEvent.setup();
    await user.click(menu(/^Branch/));
    expect(await screen.findByRole('menuitemcheckbox', { name: 'Pasay 21' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Taguig 4' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Taguig 4' }));
    expect(menu(/^Branch\s*Taguig/)).toBeInTheDocument();
    expect(names().every((n) => /Dina|Eli|Hana|Jun/.test(n))).toBe(true);
    // the menu stays open so a second branch can be ticked
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Pasay 21' }));
    expect(menu(/^Branch\s*Pasay, Taguig/)).toBeInTheDocument();
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'All branches 25' }));
    expect(menu(/^Branch\s*All branches/)).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Pasay 21' })).not.toBeChecked();
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'All branches 25' }));
    expect(menu(/^Branch\s*Select/)).toBeInTheDocument();
  });

  it('a filter button turns blue when it narrows the list, like Status and Last visit', async () => {
    render();
    const user = userEvent.setup();
    expect(menu(/^Branch\s*Select/)).not.toHaveClass('bg-brand/10');
    await pick(user, /^Branch/, /^Pasay/);
    expect(menu(/^Branch\s*Pasay/)).toHaveClass('bg-brand/10');
    // "All branches" does not narrow anything, so it stays plain
    await user.click(screen.getByRole('menuitemcheckbox', { name: /^All branches/ }));
    expect(menu(/^Branch\s*All branches/)).not.toHaveClass('bg-brand/10');
  });

  it('Status can combine Overdue recall, Due today and Has balance (any of them)', async () => {
    render();
    const user = userEvent.setup();
    await pick(user, /^Status/, /^Overdue recall 2/);
    expect(menu(/^Status\s*Overdue recall · 2/)).toBeInTheDocument();
    expect(names().map((n) => n.match(/Carlo|Jun/)?.[0])).toEqual(['Jun', 'Carlo']);
    await user.click(screen.getByRole('menuitemcheckbox', { name: /^Has balance 2/ }));
    expect(menu(/^Status\s*2 selected/)).toBeInTheDocument();
    expect(names().map((n) => n.match(/Dina|Gio|Jun|Carlo/)?.[0])).toEqual([
      'Dina',
      'Gio',
      'Jun',
      'Carlo',
    ]);
    await user.click(screen.getByRole('menuitemcheckbox', { name: /^Due today 1/ }));
    expect(screen.getByText('Showing 1–5 of 5')).toBeInTheDocument();
  });

  it('filters of different kinds narrow each other, and Clear all resets every one', async () => {
    render();
    const user = userEvent.setup();
    await pick(user, /^Branch/, /^Pasay/);
    await user.keyboard('{Escape}');
    await pick(user, /^Status/, /^Overdue recall/);
    await user.keyboard('{Escape}');
    expect(names().map((n) => n.match(/Carlo/)?.[0])).toEqual(['Carlo']);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(menu(/^Branch\s*Select/)).toBeInTheDocument();
    expect(menu(/^Status\s*Select/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear all' })).toBeNull();
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
  });

  it('says so when no one matches', async () => {
    render();
    const user = userEvent.setup();
    await pick(user, /^Branch/, /^Taguig/);
    await user.keyboard('{Escape}');
    await user.click(menu(/^Last visit/));
    await user.click(await screen.findByRole('button', { name: 'Today' }));
    expect(screen.getByText('No patient matches')).toBeInTheDocument();
  });

  it('Sort by starts with nothing picked, lists four choices, and each is a tick box', async () => {
    render();
    const user = userEvent.setup();
    expect(menu(/^Sort by\s*Select/)).toBeInTheDocument();
    // with no pick the list is still in a steady order: newest visit first
    expect(names()[2]).toContain('Dina Tan');
    await user.click(menu(/^Sort by/));
    const options = await screen.findAllByRole('menuitemcheckbox');
    expect(options.map((o) => o.textContent)).toEqual([
      'Recently visited',
      'Name A–Z',
      'Highest balance',
      'Next recall',
    ]);
  });

  it('one sort changes the order and the menu stays open for more', async () => {
    render();
    const user = userEvent.setup();
    await pick(user, /^Sort by/, /^Name A–Z/);
    expect(menu(/^Sort by\s*Name A–Z/)).toBeInTheDocument();
    expect(names()[2]).toContain('Carlo Santos');
    expect(screen.getByRole('menuitemcheckbox', { name: 'Name A–Z' })).toBeChecked();
  });

  it('several sorts apply in the order they were ticked, later ones break ties', async () => {
    render();
    const user = userEvent.setup();
    await pick(user, /^Sort by/, /^Highest balance/);
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Name A–Z' }));
    expect(menu(/^Sort by\s*2 selected/)).toBeInTheDocument();
    // balance first (Gio, Dina), then A–Z among the rest
    expect(
      names()
        .slice(0, 4)
        .map((n) => n.match(/Gio|Dina|Ana|Bea/)?.[0]),
    ).toEqual(['Gio', 'Dina', 'Ana', 'Bea']);
    // untick Highest balance: A–Z alone
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Highest balance' }));
    expect(menu(/^Sort by\s*Name A–Z/)).toBeInTheDocument();
    expect(names()[0]).toContain('Ana Reyes');
  });
});

describe('Patient records Last visit calendar', () => {
  const openCalendar = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(menu(/^Last visit/));
    return screen.findByRole('grid');
  };
  const day = (n: number) =>
    screen.getByRole('button', { name: new RegExp(`November ${n}\\w*, 2026`) });
  const quick = (name: string) => screen.getByRole('button', { name });
  const rowNames = (pattern: RegExp) => names().map((n) => n.match(pattern)?.[0]);

  it('opens a calendar under the button, with quick choices beside it and no footer', async () => {
    render();
    await openCalendar(userEvent.setup());
    const group = screen.getByRole('group', { name: 'Quick choices' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Any time', 'Today', 'Last 7 days', 'Last 30 days']);
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear dates' })).toBeNull();
  });

  it('quick choices can be combined: tick as many as you like, the calendar stays open', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(quick('Last 7 days'));
    expect(menu(/^Last visit\s*Last 7 days/)).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(quick('Last 7 days')).toHaveAttribute('aria-pressed', 'true');
    await user.click(quick('Today'));
    expect(menu(/^Last visit\s*2 selected/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(rowNames(/Ana|Bea|Dina|Eli/)).toEqual(['Ana', 'Bea', 'Dina', 'Eli']);
  });

  it('ticking a quick choice again takes it off', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(quick('Today'));
    await user.click(quick('Last 7 days'));
    await user.click(quick('Last 7 days'));
    expect(menu(/^Last visit\s*Today/)).toBeInTheDocument();
  });

  it('Any time replaces the other picks, and picking something else drops Any time', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(quick('Today'));
    await user.click(day(20));
    await user.click(quick('Any time'));
    expect(menu(/^Last visit\s*Any time/)).toBeInTheDocument();
    expect(quick('Today')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
    await user.click(quick('Today'));
    expect(menu(/^Last visit\s*Today/)).toBeInTheDocument();
    expect(quick('Any time')).toHaveAttribute('aria-pressed', 'false');
  });

  it('picking two days on the calendar keeps visits from the first to the second, both included', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(day(18));
    expect(menu(/^Last visit\s*Nov 18/)).toBeInTheDocument();
    await user.click(day(20));
    expect(menu(/^Last visit\s*Nov 18 – Nov 20/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(rowNames(/Dina|Eli/)).toEqual(['Dina', 'Eli']);
    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument();
  });

  it('a quick choice and a calendar range combine: a visit fitting either is kept', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(quick('Today'));
    await user.click(day(11)); // one click is a one-day range: just the 11th
    expect(menu(/^Last visit\s*2 selected/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(rowNames(/Ana|Bea|Gio|Dina/)).toEqual(['Ana', 'Bea', 'Gio']);
    expect(screen.getByText('Showing 1–3 of 3')).toBeInTheDocument();
  });

  it('days after today cannot be picked', async () => {
    render();
    await openCalendar(userEvent.setup());
    expect(day(26)).toBeDisabled();
    expect(day(25)).toBeEnabled();
  });

  it('the arrows move month by month, and Next stops at the current month', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('button', { name: /October 5\w*, 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled();
  });

  it('the month name opens a month and year panel instead of a browser list', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    expect(screen.queryByRole('combobox')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Choose month and year' }));
    expect(screen.queryByRole('grid')).toBeNull();
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', {
        name: /^(January|February|March|April|May|June|July|August|September|October|November|December)$/,
      }),
    ).toHaveLength(12);
    expect(screen.getByRole('button', { name: 'December' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'November' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Previous year' }));
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'December' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'March' }));
    expect(screen.getByRole('button', { name: /March 5\w*, 2025/ })).toBeInTheDocument();
  });

  it('Escape closes the calendar and keeps the picks', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(day(11));
    await user.click(day(13));
    await user.keyboard('{Escape}');
    await vi.waitFor(() => expect(screen.queryByRole('grid')).toBeNull());
    expect(menu(/^Last visit\s*Nov 11 – Nov 13/)).toBeInTheDocument();
  });

  it('Clear all removes the picks and the button asks to Select again', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(quick('Today'));
    await user.click(day(11));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(menu(/^Last visit\s*Select/)).toBeInTheDocument();
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
  });

  it('the button turns blue when picks narrow the list, but not for Any time', async () => {
    render();
    const user = userEvent.setup();
    await openCalendar(user);
    await user.click(quick('Any time'));
    expect(menu(/^Last visit\s*Any time/)).not.toHaveClass('bg-brand/10');
    await user.click(quick('Today'));
    expect(menu(/^Last visit\s*Today/)).toHaveClass('bg-brand/10');
  });
});

describe('Patient records table', () => {
  it('has the columns from the design', () => {
    render();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Patient',
      'Phone',
      'Last visit',
      'Next recall',
      'Branch',
      'Balance',
      'Actions',
    ]);
  });

  it('shows who, how to reach them, last visit, next recall, branch and balance', () => {
    render();
    const ana = screen.getByRole('row', { name: /Ana Reyes/ });
    expect(within(ana).getByText('P-000001')).toBeInTheDocument();
    expect(within(ana).getByText('0917 555 0001')).toBeInTheDocument();
    expect(within(ana).getByText('Today')).toBeInTheDocument();
    expect(within(ana).getByText('Nov 2027')).toBeInTheDocument();
    expect(within(ana).getByText('Pasay')).toBeInTheDocument();
    expect(within(ana).getByLabelText('No balance')).toBeInTheDocument();
  });

  it('stresses overdue and due-today recalls, and shows older visits with the year', () => {
    render();
    expect(
      within(screen.getByRole('row', { name: /Jun Aquino/ })).getByText('5 days overdue'),
    ).toHaveClass('font-semibold');
    expect(
      within(screen.getByRole('row', { name: /Fe Mendoza/ })).getByText('Due today'),
    ).toHaveClass('font-semibold');
    const carlo = screen.getByRole('row', { name: /Carlo Santos/ });
    expect(within(carlo).getByText('3 weeks overdue')).toBeInTheDocument();
    expect(within(carlo).getByText('Oct 14, 2025')).toBeInTheDocument();
  });

  it('shows what a patient owes in red', () => {
    render();
    const dina = screen.getByRole('row', { name: /Dina Tan/ });
    expect(within(dina).getByText('₱3,200')).toHaveClass('text-error');
    expect(within(dina).getByText('Nov 20')).toBeInTheDocument();
  });
});

describe('Patient records footer', () => {
  it('shows 50 per page by default, with the count', () => {
    render();
    expect(menu(/^Rows per page\s*50 patients/)).toBeInTheDocument();
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('Rows per page changes the page size and the page buttons', async () => {
    render();
    const user = userEvent.setup();
    await user.click(menu(/^Rows per page/));
    const options = await screen.findAllByRole('menuitemradio');
    expect(options.map((o) => o.textContent)).toEqual([
      '10 patients',
      '25 patients',
      '50 patients',
      '100 patients',
    ]);
    await user.click(screen.getByRole('menuitemradio', { name: '10 patients' }));
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Page 4' })).toBeNull();
  });

  it('moves between pages with the numbers, Previous and Next, and says where it is', async () => {
    render();
    const user = userEvent.setup();
    await user.click(menu(/^Rows per page/));
    await user.click(await screen.findByRole('menuitemradio', { name: '10 patients' }));
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Showing 21–25 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
  });

  it('goes back to page 1 when a filter changes', async () => {
    render();
    const user = userEvent.setup();
    await user.click(menu(/^Rows per page/));
    await user.click(await screen.findByRole('menuitemradio', { name: '10 patients' }));
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    await pick(user, /^Branch/, /^Pasay/);
    expect(screen.getByText('Showing 1–10 of 21')).toBeInTheDocument();
  });
});

describe('Patient records actions', () => {
  it('staff get New patient and a book-a-visit button on every row', () => {
    render();
    expect(screen.getByRole('button', { name: /New patient/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Book a visit for Ana Reyes' })).toHaveAttribute(
      'href',
      '/staff/appointments',
    );
  });

  it('doctors only read the list', () => {
    render(fakeUser({ role: 'optometrist' }));
    expect(screen.queryByRole('button', { name: /New patient/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Book a visit for/ })).toBeNull();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).not.toContain('Actions');
  });
});
