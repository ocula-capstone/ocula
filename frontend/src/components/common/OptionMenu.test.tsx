import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OptionMenu } from '@/components/common/OptionMenu';

const options = [
  { value: 'a', label: 'Overdue recall', count: 3 },
  { value: 'b', label: 'Due today', count: 0 },
];

describe('OptionMenu counts', () => {
  it('shows how many match, but leaves out a zero', async () => {
    render(
      <OptionMenu
        multi
        label="Status"
        summary="Select"
        options={options}
        selected={[]}
        onChange={() => {}}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /^Status/ }));
    expect(
      await screen.findByRole('menuitemcheckbox', { name: 'Overdue recall 3' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: 'Due today' })).toBeInTheDocument();
  });
});
