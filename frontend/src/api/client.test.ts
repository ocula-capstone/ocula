import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '@/api/client';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('apiUrl', () => {
  it('uses VITE_API_URL when it is set', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test');
    expect(apiUrl('/branches')).toBe('https://api.test/api/branches');
  });

  it('ignores a trailing slash', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/');
    expect(apiUrl('/branches')).toBe('https://api.test/api/branches');
  });

  it('does not double the /api when the env value already ends in it', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.test/api');
    expect(apiUrl('/branches')).toBe('https://api.test/api/branches');
  });

  it('falls back to the same origin when it is empty', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(apiUrl('/branches')).toBe('/api/branches');
  });
});
