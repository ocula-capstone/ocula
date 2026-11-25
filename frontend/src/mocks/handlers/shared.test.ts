import { describe, expect, it } from 'vitest';
import { authedUser } from '@/mocks/handlers/shared';

const requestWith = (authorization?: string) =>
  new Request('http://localhost/api/auth/me', {
    headers: authorization ? { Authorization: authorization } : {},
  });

describe('authedUser', () => {
  it('finds the user for a Bearer token', () => {
    expect(authedUser(requestWith('Bearer access-u-staff'))?.email).toBe('staff@ocula.test');
  });

  it('rejects a token sent without the Bearer prefix, like the real server', () => {
    expect(authedUser(requestWith('access-u-staff'))).toBeUndefined();
  });

  it('rejects an unknown token and a missing header', () => {
    expect(authedUser(requestWith('Bearer access-nobody'))).toBeUndefined();
    expect(authedUser(requestWith())).toBeUndefined();
  });
});
