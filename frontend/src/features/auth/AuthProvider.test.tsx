import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth, type AuthContextValue } from '@/features/auth/auth-context';

// The real API is replaced so the test never touches the network.
vi.mock('@/api/auth', () => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
}));

describe('AuthProvider', () => {
  it('logout clears the query cache', async () => {
    const queryClient = new QueryClient();
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
    // With no stored token the provider settles as "signed out".
    await waitFor(() => expect(auth.isLoading).toBe(false));

    queryClient.setQueryData(['branch', 'b-pasay', 'patients'], ['someone else']);
    expect(queryClient.getQueryData(['branch', 'b-pasay', 'patients'])).toBeDefined();

    await act(() => auth.logout());

    expect(queryClient.getQueryData(['branch', 'b-pasay', 'patients'])).toBeUndefined();
  });
});
