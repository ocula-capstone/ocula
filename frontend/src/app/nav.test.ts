import { describe, expect, it } from 'vitest';
import { pageTitle } from '@/app/nav';

describe('pageTitle', () => {
  it('names the menu item that matches, even on a page below it', () => {
    expect(pageTitle('staff', '/staff')).toBe('Dashboard');
    expect(pageTitle('staff', '/staff/billing')).toBe('Billing');
    expect(pageTitle('optometrist', '/doctor/patients/MRB-001')).toBe('Patient Records');
  });

  it('names pages that are not in the menu', () => {
    expect(pageTitle('staff', '/staff/change-password')).toBe('Change password');
    expect(pageTitle('patient', '/me/appointments')).toBe('My appointments');
    expect(pageTitle('patient', '/me/prescriptions')).toBe('My prescriptions');
  });
});
