import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VisitTable } from '@/features/appointments/components/VisitTable';
import { fakeUser, renderWithProviders } from '@/test/render';

const TODAY = '2026-11-26';
const renderEmpty = (day: string, filtering = false) => {
  const onBookNew = vi.fn();
  renderWithProviders(
    <VisitTable
      day={day}
      today={TODAY}
      visits={[]}
      slots={[]}
      filtering={filtering}
      onBook={() => undefined}
      onBookNew={onBookNew}
      onReschedule={() => undefined}
      onRebook={() => undefined}
    />,
    { user: fakeUser({ role: 'staff' }) },
  );
  return onBookNew;
};

describe('VisitTable with nothing in it', () => {
  it('says there are no visits today, and offers to book one', async () => {
    const onBookNew = renderEmpty(TODAY);
    expect(screen.getByText('No visits today')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Book a visit' }));
    expect(onBookNew).toHaveBeenCalledOnce();
  });

  it('names the day when it is not today', () => {
    renderEmpty('2026-11-27');
    expect(screen.getByText('No visits on Fri, Nov 27')).toBeInTheDocument();
  });

  it('says nothing matches, and does not offer to book, when a search or filter is on', () => {
    renderEmpty(TODAY, true);
    expect(screen.getByText('No visits match')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Book a visit' })).toBeNull();
  });

  it('has no "Showing all …" line when there is nothing to show', () => {
    renderEmpty(TODAY);
    expect(screen.queryByText(/^Showing all/)).toBeNull();
  });
});
