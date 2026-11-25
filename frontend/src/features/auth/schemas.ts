import { z } from 'zod';
import { isBirthDate, toIsoDate } from '@/lib/dates';
import { normalizePhone } from '@/lib/phone';

// Same wording as the backend, so a mistake reads the same whichever page or server shows it.
const email = z.email('Enter a valid email address');
const newPassword = z.string().min(8, 'Use at least 8 characters');

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter email or mobile number'),
  password: z.string().min(1, 'Password is required'),
});

const confirmPassword = z.string().min(1, 'Confirm your password');

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name')
      .max(100, 'Use 100 characters or fewer'),
    email,
    // Both layouts show "+63" as a fixed prefix (user types 9XX XXX XXXX). A typed +63 or 0 prefix,
    // with optional spaces/dashes, is also accepted. Always sent as +639XXXXXXXXX.
    phone: z
      .string()
      .transform((v) => normalizePhone(v) ?? '')
      .pipe(z.string().min(1, 'Enter valid 10-digit number')),
    // Typed as mm/dd/yyyy; sent to the API as YYYY-MM-DD.
    birthDate: z
      .string()
      .transform((v) => toIsoDate(v) ?? '')
      .pipe(z.string().refine((v) => isBirthDate(v), 'Enter date of birth')),
    password: newPassword,
    confirmPassword: z.string().min(1, 'Re-enter your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ newPassword, confirmPassword })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword,
    confirmPassword,
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
