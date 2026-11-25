import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/features/auth/schemas';

// The paths of the fields that failed, e.g. ['phone', 'birthDate'].
const failedFields = (result: { error?: { issues: { path: PropertyKey[] }[] } }) =>
  result.error?.issues.map((issue) => String(issue.path[0])) ?? [];

const validRegister = {
  fullName: 'Maria Santos',
  email: 'maria@example.com',
  phone: '917 123 4567',
  birthDate: '05/21/1990',
  password: 'password123',
  confirmPassword: 'password123',
};

describe('registerSchema', () => {
  it('turns what was typed into what the API takes', () => {
    const result = registerSchema.parse(validRegister);
    expect(result.phone).toBe('+639171234567');
    expect(result.birthDate).toBe('1990-05-21');
  });

  it('accepts a phone typed with the 0 or +63 prefix', () => {
    for (const phone of ['09171234567', '+63 917-123-4567']) {
      expect(registerSchema.parse({ ...validRegister, phone }).phone).toBe('+639171234567');
    }
  });

  it('refuses a phone that is not a mobile number', () => {
    expect(failedFields(registerSchema.safeParse({ ...validRegister, phone: '12345' }))).toEqual([
      'phone',
    ]);
  });

  it('refuses a date of birth that is empty, impossible or in the future', () => {
    for (const birthDate of ['', '13/45/1990', '02/30/1990', '01/01/2999']) {
      expect(failedFields(registerSchema.safeParse({ ...validRegister, birthDate }))).toEqual([
        'birthDate',
      ]);
    }
  });

  it('refuses a short password and a confirmation that does not match', () => {
    const short = { ...validRegister, password: 'short', confirmPassword: 'short' };
    expect(failedFields(registerSchema.safeParse(short))).toEqual(['password']);
    const mismatch = { ...validRegister, confirmPassword: 'different123' };
    expect(failedFields(registerSchema.safeParse(mismatch))).toEqual(['confirmPassword']);
  });

  it('refuses a bad email and a too-short name', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'nope', fullName: 'M' });
    expect(failedFields(result).sort()).toEqual(['email', 'fullName']);
  });
});

describe('loginSchema', () => {
  it('trims the email or phone and needs both boxes filled', () => {
    expect(loginSchema.parse({ identifier: '  0917 123 4567 ', password: 'x' }).identifier).toBe(
      '0917 123 4567',
    );
    expect(failedFields(loginSchema.safeParse({ identifier: '   ', password: '' })).sort()).toEqual(
      ['identifier', 'password'],
    );
  });
});

describe('password schemas', () => {
  it('forgot password needs a real email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });

  it('reset and change need 8 characters and a matching confirmation', () => {
    const reset = { newPassword: 'password123', confirmPassword: 'password123' };
    expect(resetPasswordSchema.safeParse(reset).success).toBe(true);
    expect(failedFields(resetPasswordSchema.safeParse({ ...reset, confirmPassword: 'x' }))).toEqual(
      ['confirmPassword'],
    );
    const change = { currentPassword: 'old', ...reset };
    expect(changePasswordSchema.safeParse(change).success).toBe(true);
    expect(
      failedFields(changePasswordSchema.safeParse({ ...change, currentPassword: '' })),
    ).toEqual(['currentPassword']);
  });
});
