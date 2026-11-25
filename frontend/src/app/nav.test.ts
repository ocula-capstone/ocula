import { describe, expect, it } from 'vitest';
import { pageTitle } from '@/app/nav';

describe('pageTitle', () => {
  it('names the menu item that matches, even on a page below it', () => {
    expect(pageTitle('staff', '/staff')).toBe('Dashboard');
    expect(pageTitle('staff', '/staff/billing')).toBe('Billing');
    expect(pageTitle('optometrist', '/doctor/patients/MRB-001')).toBe('Patient Records');
  });

  it('uses the shorter staff names from the design', () => {
    expect(pageTitle('staff', '/staff/patients')).toBe('Patients');
    expect(pageTitle('staff', '/staff/job-orders')).toBe('Job orders');
    expect(pageTitle('staff', '/staff/auto-refractor')).toBe('Auto-refractor');
    expect(pageTitle('staff', '/staff/recalls')).toBe('Recalls');
  });

  it('names Settings for staff even though it is not in their sidebar', () => {
    expect(pageTitle('staff', '/staff/settings')).toBe('Settings');
  });

  it('names pages that are not in the menu', () => {
    expect(pageTitle('staff', '/staff/change-password')).toBe('Change password');
    expect(pageTitle('patient', '/me/appointments')).toBe('My appointments');
    expect(pageTitle('patient', '/me/prescriptions')).toBe('My prescriptions');
  });
});
