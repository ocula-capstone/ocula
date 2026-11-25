import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RegisterMobile } from '@/features/auth/components/RegisterMobile';
import { useRegisterForm } from '@/features/auth/useRegisterForm';
import { renderWithProviders } from '@/test/render';

function Page() {
  return <RegisterMobile form={useRegisterForm()} />;
}

describe('Date of Birth field on the register form', () => {
  it('shows the slashes as the person types', async () => {
    renderWithProviders(<Page />);
    const box = screen.getByLabelText('Date of Birth');
    await userEvent.setup().type(box, '05211990');
    expect((box as HTMLInputElement).value).toBe('05/21/1990');
  });

  it('lets backspace delete back through a slash', async () => {
    renderWithProviders(<Page />);
    const box = screen.getByLabelText('Date of Birth');
    const typing = userEvent.setup();
    await typing.type(box, '0521'); // shows 05/21/
    await typing.type(box, '{Backspace}'); // removes the slash, not stuck on it
    expect((box as HTMLInputElement).value).toBe('05/21');
  });
});
