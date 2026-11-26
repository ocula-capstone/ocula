import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { DataTable, type Column } from '@/components/common/DataTable';

interface Person {
  id: string;
  name: string;
  phone: string;
}

const columns: Column<Person>[] = [
  { key: 'name', header: 'Name', cell: (p) => p.name },
  { key: 'phone', header: 'Phone', cell: (p) => p.phone },
];

const people: Person[] = [
  { id: '1', name: 'Maria Santos', phone: '0917 111 1111' },
  { id: '2', name: 'Juan Dela Cruz', phone: '0917 222 2222' },
];

const baseProps = {
  columns,
  getRowId: (p: Person) => p.id,
  emptyTitle: 'No patients yet',
  isLoading: false,
  error: null,
};

// Pretends the screen is phone-sized: no min-width query matches.
function usePhoneScreen() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

describe('DataTable on a phone', () => {
  beforeEach(usePhoneScreen);
  afterEach(() => vi.unstubAllGlobals());

  it('shows each row as a card with labelled values, not a table', () => {
    render(<DataTable {...baseProps} rows={people} label="Patients" />);
    expect(screen.queryByRole('table')).toBeNull();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('Maria Santos')).toBeTruthy(); // the title
    expect(within(cards[0]).getByText('Phone')).toBeTruthy(); // a label
    expect(within(cards[0]).getByText('0917 111 1111')).toBeTruthy(); // its value
    expect(screen.getByRole('list', { name: 'Patients' })).toBeTruthy();
  });

  it('shows busy skeleton cards while loading', () => {
    render(<DataTable {...baseProps} rows={undefined} isLoading />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
  });

  it('still shows the empty state and the error', () => {
    const { rerender } = render(<DataTable {...baseProps} rows={[]} />);
    expect(screen.getByText('No patients yet')).toBeTruthy();
    rerender(
      <DataTable
        {...baseProps}
        rows={[]}
        error={new ApiError(500, 'server_error', 'Server down')}
      />,
    );
    expect(screen.getByText('Server down')).toBeTruthy();
  });
});

describe('DataTable', () => {
  it('shows a busy skeleton while loading, with no data rows', () => {
    render(<DataTable {...baseProps} rows={undefined} isLoading />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Maria Santos')).toBeNull();
    expect(screen.queryByText('No patients yet')).toBeNull();
  });

  it('shows the empty state when there are no rows', () => {
    render(<DataTable {...baseProps} rows={[]} emptyDescription="Register one to begin." />);
    expect(screen.getByText('No patients yet')).toBeTruthy();
    expect(screen.getByText('Register one to begin.')).toBeTruthy();
  });

  it('shows the error and retries when asked', async () => {
    const onRetry = vi.fn();
    render(
      <DataTable
        {...baseProps}
        rows={undefined}
        error={new ApiError(500, 'server_error', 'Server down')}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Server down')).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('keeps showing rows when a refresh fails, and shows the error only when there is nothing', () => {
    const error = new ApiError(500, 'server_error', 'Server down');
    const { rerender } = render(<DataTable {...baseProps} rows={people} error={error} />);
    expect(screen.getByText('Maria Santos')).toBeTruthy();
    expect(screen.queryByText('Server down')).toBeNull();

    rerender(<DataTable {...baseProps} rows={[]} error={error} />);
    expect(screen.getByText('Server down')).toBeTruthy();
  });

  it('gives the table an accessible name when a label is passed', () => {
    render(<DataTable {...baseProps} rows={people} label="Patients" />);
    expect(screen.getByRole('table', { name: 'Patients' })).toBeTruthy();
  });

  it('renders one row per item under its headers', () => {
    render(<DataTable {...baseProps} rows={people} />);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2
    expect(screen.getByText('Juan Dela Cruz')).toBeTruthy();
    expect(screen.getByText('0917 222 2222')).toBeTruthy();
  });
});
