import { randomInt } from 'node:crypto';

// No look-alike characters (0/O, 1/l/I), so it's easy to read out or copy by hand.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A random password like `Kp7m-x3Qa-9rTe`, shown once to the admin. */
export function temporaryPassword(): string {
  const group = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
      '',
    );
  return `${group()}-${group()}-${group()}`;
}
