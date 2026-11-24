import { ConflictException } from '@nestjs/common';
import { uniqueFields } from './http-exception.filter.js';

export const emailTaken = () =>
  new ConflictException({
    error: {
      code: 'email_taken',
      message: 'An account with this email already exists.',
      fields: { email: 'An account with this email already exists.' },
    },
  });

export const phoneTaken = () =>
  new ConflictException({
    error: {
      code: 'phone_taken',
      message: 'An account with this mobile number already exists.',
      fields: { phone: 'An account with this mobile number already exists.' },
    },
  });

/**
 * Turns a Prisma unique-constraint error on users.email or users.phone into the
 * matching 409, for two sign-ups racing each other. Anything else is rethrown.
 */
export function rethrowUserConflict(error: unknown): never {
  const e = error as { code?: string; meta?: Record<string, unknown> };
  if (e.code === 'P2002') {
    const fields = uniqueFields(e.meta);
    if (fields.includes('phone')) throw phoneTaken();
    if (fields.includes('email')) throw emailTaken();
  }
  throw error;
}
