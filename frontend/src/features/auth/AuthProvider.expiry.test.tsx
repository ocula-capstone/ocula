import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth, type AuthContextValue } from '@/features/auth/auth-context';

// A fake server answer in the API's error format: { error: { code, message } }.
const rejected = (code: string) =>
  new Response(JSON.stringify({ error: { code, message: code } }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthProvider when the session has expired', () => {
  it('clears the query cache and the stored token when the refresh token is rejected', async () => {
    // The server rejects the access token, then rejects the stored refresh token too.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/auth/refresh')
          ? rejected('invalid_refresh_token')
          : rejected('unauthorized'),
      ),
    );
    localStorage.setItem('ocula.refreshToken', 'expired-token');

    const queryClient = new QueryClient();
    queryClient.setQueryData(['branch', 'b-pasay', 'patients'], ['previous user']);
    let auth!: AuthContextValue;
    function Probe() {
      auth = useAuth();
      return null;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    // Restoring the session fails, so the provider settles as "signed out".
    await waitFor(() => expect(auth.isLoading).toBe(false));

    expect(auth.user).toBeNull();
    expect(localStorage.getItem('ocula.refreshToken')).toBeNull();
    expect(queryClient.getQueryData(['branch', 'b-pasay', 'patients'])).toBeUndefined();
  });
});
