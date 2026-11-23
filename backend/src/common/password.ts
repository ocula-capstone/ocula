import { hash, verify } from '@node-rs/argon2';

// Argon2id with the library's recommended defaults. The hash string stores its own salt and settings.
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password);
}
