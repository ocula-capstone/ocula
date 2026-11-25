import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/api/auth';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth, type AuthContextValue } from '@/features/auth/auth-context';
import { fakeUser } from '@/test/render';

// The real API is replaced so the test never touches the network.
vi.mock('@/api/auth', () => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => localStorage.clear());

describe('AuthProvider.passwordChanged', () => {
  it('clears the temporary-password flag on the signed-in user', async () => {
    vi.mocked(authApi.login).mockResolvedValue({
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 900,
      user: fakeUser({ mustChangePassword: true }),
    });
    let auth!: AuthContextValue;
    function Probe() {
      const value = useAuth();
      useEffect(() => {
        auth = value;
      });
      return null;
    }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(auth.isLoading).toBe(false));
    await act(() => auth.login({ identifier: 'staff@ocula.test', password: 'password123' }));
    expect(auth.user?.mustChangePassword).toBe(true);

    act(() => auth.passwordChanged());

    expect(auth.user?.mustChangePassword).toBe(false);
    expect(auth.user?.fullName).toBe('Test User'); // nothing else about the user changed
  });
});
