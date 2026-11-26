import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  PatientPicker,
  type PatientChoice,
} from '@/features/appointments/components/PatientPicker';

// The picker is controlled, so the test holds the chosen patient the way the booking box does.
function Harness() {
  const [value, setValue] = useState<PatientChoice | null>(null);
  return <PatientPicker value={value} onChange={setValue} />;
}

describe('PatientPicker', () => {
  it('goes back to the search box, not the new-patient form, after Change', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'New patient' }));
    await userEvent.type(screen.getByLabelText('Full name'), 'Walk In Person');
    await userEvent.click(screen.getByRole('button', { name: 'Use this patient' }));
    expect(screen.getByText('Walk In Person')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByLabelText('Search patients')).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).toBeNull();
  });
});
