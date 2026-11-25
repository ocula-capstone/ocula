import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { shouldRetry } from '@/app/query-client';

describe('shouldRetry', () => {
  it('does not retry 4xx errors, which will fail the same way again', () => {
    expect(shouldRetry(0, new ApiError(404, 'not_found', 'Not found'))).toBe(false);
    expect(shouldRetry(0, new ApiError(422, 'validation_failed', 'Bad input'))).toBe(false);
  });

  it('retries server errors twice, then stops', () => {
    const error = new ApiError(500, 'server_error', 'Server down');
    expect(shouldRetry(0, error)).toBe(true);
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });

  it('retries network errors twice, then stops', () => {
    const error = new TypeError('Failed to fetch');
    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(false);
  });
});
