import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import { BranchProvider } from '@/features/branches/BranchProvider';
import type { AuthUser } from '@/types/auth';

export function fakeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u-1',
    email: 'staff@ocula.test',
    phone: null,
    fullName: 'Test User',
    role: 'staff',
    mustChangePassword: false,
    branches: [],
    ...overrides,
  };
}

const notInTests = async (): Promise<never> => {
  throw new Error('not available in renderWithProviders');
};

// Renders `ui` as if `user` were logged in. No login call, no network.
export function renderWithProviders(
  ui: ReactElement,
  {
    user = null,
    route = '/',
    auth,
  }: { user?: AuthUser | null; route?: string; auth?: Partial<AuthContextValue> } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          isLoading: false,
          login: notInTests,
          register: notInTests,
          logout: notInTests,
          passwordChanged: () => undefined,
          ...auth, // lets a test watch or replace one action
        }}
      >
        <BranchProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </BranchProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}
