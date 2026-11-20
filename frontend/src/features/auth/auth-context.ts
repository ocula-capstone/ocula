import { createContext, useContext } from 'react';
import type { AuthUser, LoginRequest, RegisterRequest, Role } from '@/types/auth';

export const ROLE_HOME: Record<Role, string> = {
  staff: '/staff',
  optometrist: '/doctor',
  patient: '/me',
};

export interface AuthContextValue {
  user: AuthUser | null;
  // true until the first GET /auth/me on page load has settled
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<AuthUser>;
  register: (data: RegisterRequest) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
