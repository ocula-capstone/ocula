import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StaffDashboard } from '@/features/dashboard/pages/StaffDashboard';
import { fakeUser, renderWithProviders } from '@/test/render';

// Test-only rows, in the order the comp shows them. The numbers below follow from these.
vi.mock('@/mocks/data/samples', () => ({
  clinicClosesAt: '8:00 PM',
  todayQueue: [
    { id: 'v1', time: '9:00 AM', patient: 'Done One', service: 'Eye exam', status: 'Done' },
    { id: 'v2', time: '10:00 AM', patient: 'Done Two', service: 'Eye exam', status: 'Done' },
    {
      id: 'v3',
      time: '5:45 PM',
      patient: 'Jose Dela Cruz',
      service: 'Eye exam · new patient',
      status: 'In exam',
    },
    {
      id: 'v4',
      time: '6:00 PM',
      patient: 'Maria Bautista',
      service: 'Frame fitting · JO #1038',
      status: 'Waiting',
    },
    {
      id: 'v5',
      time: '6:30 PM',
      patient: 'Ana Reyes',
      service: 'Contact lens follow-up',
      status: 'Booked',
    },
    {
      id: 'v6',
      time: '7:00 PM',
      patient: 'Paolo Garcia',
      service: 'Annual eye exam',
      status: 'Booked',
    },
  ],
  recalls: [
    {
      id: 'r1',
      patient: 'Miguel Santos',
      reason: 'Annual exam',
      due: '3 weeks overdue',
      phone: '09171234567',
      status: 'Overdue',
    },
    {
      id: 'r2',
      patient: 'Old Overdue',
      reason: 'Follow-up',
      due: '2 weeks overdue',
      phone: '09170000001',
      status: 'Overdue',
    },
    {
      id: 'r3',
      patient: 'Liza Mendoza',
      reason: 'Contact lens check',
      due: 'due today',
      phone: '09179876543',
      status: 'Due today',
    },
    {
      id: 'r4',
      patient: 'Later Person',
      reason: 'Check',
      due: 'due Dec 1',
      phone: '09170000002',
      status: 'Upcoming',
    },
  ],
  jobOrders: [
    {
      id: 'JO-1042',
      patient: 'Carlo Lim',
      item: 'Lenses',
      stage: 'In lab',
      due: 'today',
      delayed: true,
    },
    { id: 'JO-1050', patient: 'R1', item: 'Frame', stage: 'Ready', due: 'today' },
    { id: 'JO-1051', patient: 'R2', item: 'Frame', stage: 'Ready', due: 'today' },
    { id: 'JO-1052', patient: 'R3', item: 'Frame', stage: 'Ready', due: 'today' },
  ],
  receipts: [
    {
      id: 'OR-1',
      patient: 'Grace Tan',
      items: 'Frames',
      amount: 3200,
      status: 'Unpaid',
      ageDays: 5,
    },
    {
      id: 'OR-2',
      patient: 'Half Payer',
      items: 'Lenses',
      amount: 3250,
      status: 'Partial',
      ageDays: 2,
    },
    { id: 'OR-3', patient: 'Paid Person', items: 'Exam', amount: 800, status: 'Paid', ageDays: 9 },
  ],
  stock: [{ sku: 'LN-1', item: '1.56 blue-cut lenses', category: 'Lenses', qty: 4, min: 8 }],
}));

function renderPage() {
  return renderWithProviders(<StaffDashboard />, {
    user: fakeUser({ role: 'staff', fullName: 'Sam Staff' }),
    route: '/staff',
  });
}

describe('StaffDashboard header', () => {
  it('greets by first name with the date and when the clinic closes', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /^Good (morning|afternoon|evening), Sam$/,
    );
    expect(screen.getByText(/Clinic open until 8:00 PM/)).toBeInTheDocument();
  });

  it('has an Add walk-in link and a New menu that leads to each create page', async () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Add walk-in' })).toHaveAttribute(
      'href',
      '/staff/patients',
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /^New/ }));
    expect(await screen.findByRole('menuitem', { name: 'New patient' })).toHaveAttribute(
      'href',
      '/staff/patients',
    );
    expect(screen.getByRole('menuitem', { name: 'Book a visit' })).toHaveAttribute(
      'href',
      '/staff/appointments',
    );
    expect(screen.getByRole('menuitem', { name: 'New bill' })).toHaveAttribute(
      'href',
      '/staff/billing',
    );
    expect(screen.getByRole('menuitem', { name: 'New job order' })).toHaveAttribute(
      'href',
      '/staff/job-orders',
    );
  });
});

describe('StaffDashboard stat cards', () => {
  it("today's visits: total, done and left, and who is next", () => {
    renderPage();
    const card = screen.getByRole('group', { name: "Today's visits" });
    expect(within(card).getByText('6')).toBeInTheDocument();
    expect(within(card).getByText('2 done · 4 left')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Next: 6:30 PM · Ana Reyes' })).toHaveAttribute(
      'href',
      '/staff/appointments',
    );
  });

  it('overdue recalls: the amber card with the due-today count and the call list', () => {
    renderPage();
    const card = screen.getByRole('group', { name: 'Overdue recalls' });
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('+1 due today')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Call list ready/ })).toHaveAttribute(
      'href',
      '/staff/recalls',
    );
    expect(card).toHaveClass('bg-amber-50');
  });

  it('ready for pickup: how many job orders are ready', () => {
    renderPage();
    const card = screen.getByRole('group', { name: 'Ready for pickup' });
    expect(within(card).getByText('3')).toBeInTheDocument();
    expect(within(card).getByText('job orders')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Send pickup texts' })).toHaveAttribute(
      'href',
      '/staff/job-orders',
    );
  });

  it('unpaid balances: the total owed (unpaid and part-paid), how many, and how old', () => {
    renderPage();
    const card = screen.getByRole('group', { name: 'Unpaid balances' });
    expect(within(card).getByText('₱6,450')).toBeInTheDocument();
    expect(within(card).getByText('2 invoices · oldest 5 days')).toBeInTheDocument();
  });

  it('shows no revenue anywhere', () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/revenue/i);
  });
});

describe("StaffDashboard today's queue", () => {
  it('counts the people who have arrived and are waiting', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Today's queue/ })).toHaveTextContent('1 waiting');
  });

  it('gives each status its own next step', () => {
    renderPage();
    const queue = screen.getByRole('region', { name: /Today's queue/ });
    const rowFor = (name: string) => within(queue).getByText(name).closest('li') as HTMLElement;
    expect(within(rowFor('Jose Dela Cruz')).getByText('In exam')).toBeInTheDocument();
    expect(
      within(rowFor('Jose Dela Cruz')).getByRole('link', { name: /Open records/ }),
    ).toBeInTheDocument();
    expect(within(rowFor('Maria Bautista')).getByText('Waiting')).toBeInTheDocument();
    expect(
      within(rowFor('Maria Bautista')).getByRole('button', { name: /Start exam/ }),
    ).toBeInTheDocument();
    expect(within(rowFor('Ana Reyes')).getByText('Booked')).toBeInTheDocument();
    expect(
      within(rowFor('Ana Reyes')).getByRole('button', { name: /Check in/ }),
    ).toBeInTheDocument();
  });

  it('Upcoming hides finished visits and All shows them', async () => {
    renderPage();
    const queue = screen.getByRole('region', { name: /Today's queue/ });
    expect(within(queue).queryByText('Done One')).toBeNull();
    await userEvent.setup().click(within(queue).getByRole('button', { name: 'All' }));
    expect(within(queue).getByText('Done One')).toBeInTheDocument();
    expect(within(queue).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('links to all appointments', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /View all appointments/ })).toHaveAttribute(
      'href',
      '/staff/appointments',
    );
  });
});

describe('StaffDashboard side panels', () => {
  it('needs attention lists late work, low stock and unpaid balances', () => {
    renderPage();
    const panel = screen.getByRole('region', { name: 'Needs attention' });
    expect(within(panel).getByText('Job order #1042 delayed at lab')).toBeInTheDocument();
    expect(within(panel).getByText('Promised to Carlo Lim today')).toBeInTheDocument();
    expect(within(panel).getByText('Low stock: 1.56 blue-cut lenses')).toBeInTheDocument();
    expect(within(panel).getByText('4 left')).toBeInTheDocument();
    expect(within(panel).getByText('Unpaid balance · Grace Tan')).toBeInTheDocument();
    expect(within(panel).getByText('₱3,200 · 5 days')).toBeInTheDocument();
  });

  it('recalls to call: overdue and due today only, each with a call button', () => {
    renderPage();
    const panel = screen.getByRole('region', { name: 'Recalls to call' });
    expect(within(panel).getByText('Miguel Santos')).toBeInTheDocument();
    expect(within(panel).getByText('Annual exam · 3 weeks overdue')).toBeInTheDocument();
    expect(within(panel).getByText('Liza Mendoza')).toBeInTheDocument();
    expect(within(panel).queryByText('Later Person')).toBeNull();
    expect(within(panel).getByRole('link', { name: 'Call Miguel Santos' })).toHaveAttribute(
      'href',
      'tel:09171234567',
    );
    expect(within(panel).getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/staff/recalls',
    );
  });
});
