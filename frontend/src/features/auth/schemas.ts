import { z } from 'zod';

const email = z.email('Enter a valid email');
const newPassword = z.string().min(8, 'Password must be at least 8 characters');

export const loginSchema = z.object({
  email,
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
    email: z.email('Enter a valid email address'),
    // Mobile shows "+63" as a fixed prefix (user types 9XX XXX XXXX); desktop shows it in the
    // placeholder. Both forms are accepted, with optional spaces/dashes, and sent as +639XXXXXXXXX.
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s-]/g, ''))
      .pipe(
        z.string().regex(/^(?:\+63|0)?9\d{9}$/, 'Enter a 10-digit mobile number starting with 9'),
      )
      .transform((v) => `+63${v.slice(-10)}`),
    password: z.string().min(8, 'Use at least 8 characters'),
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
