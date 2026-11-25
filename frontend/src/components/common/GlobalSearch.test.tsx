import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { fakeUser, renderWithProviders } from '@/test/render';

// Shows where the search took us, so the test can read the address.
function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderSearch() {
  return renderWithProviders(
    <>
      <GlobalSearch to="/staff/patients" placeholder="Search patient by name, phone or ID" />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>,
    { user: fakeUser({ role: 'staff' }), route: '/staff' },
  );
}

const field = () => screen.getByRole('searchbox', { name: 'Search patients by name, phone or ID' });

describe('GlobalSearch', () => {
  it('opens the patient list filtered by what was typed when you press Enter', async () => {
    renderSearch();
    await userEvent.setup().type(field(), 'dela cruz{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent('/staff/patients?q=dela%20cruz');
  });

  it('opens the unfiltered list on Enter with nothing typed', async () => {
    renderSearch();
    await userEvent.setup().type(field(), '{Enter}');
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/staff\/patients$/);
  });

  it('is focused by Cmd+K or Ctrl+K from anywhere', async () => {
    renderSearch();
    const user = userEvent.setup();
    expect(field()).not.toHaveFocus();
    await user.keyboard('{Meta>}k{/Meta}');
    expect(field()).toHaveFocus();
    (document.activeElement as HTMLElement).blur();
    await user.keyboard('{Control>}k{/Control}');
    expect(field()).toHaveFocus();
  });

  it('shows the shortcut hint only when asked to', () => {
    const { unmount } = renderSearch();
    expect(screen.queryByText(/^(⌘K|Ctrl K)$/)).toBeNull();
    unmount();
    renderWithProviders(<GlobalSearch to="/staff/patients" showShortcut />, {
      user: fakeUser({ role: 'staff' }),
    });
    expect(screen.getByText(/^(⌘K|Ctrl K)$/)).toBeInTheDocument();
  });
});
