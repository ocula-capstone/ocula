import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

/**
 * Philippine mobile numbers in one format: +639XXXXXXXXX.
 * Accepts 09171234567, 9171234567 and +639171234567, with spaces or dashes.
 * Returns null for anything else.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  const match = /^(?:\+63|0)?(9\d{9})$/.exec(digits);
  return match ? `+63${match[1]}` : null;
}

export const PHONE_MESSAGE = 'Enter a mobile number like 0917 123 4567.';

/** DTO field: normalizes the number, then checks it. */
export function IsPhMobile() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string'
        ? (normalizePhone(value) ?? value.trim())
        : value,
    ),
    Matches(/^\+639\d{9}$/, { message: PHONE_MESSAGE }),
  );
}
