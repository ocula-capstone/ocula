import { api } from '@/api/client';
import type {
  AuthResponse,
  AuthTokens,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@/types/auth';

const post = { method: 'POST' } as const;

export const login = (body: LoginRequest) =>
  api<AuthResponse>('/auth/login', { ...post, body, auth: false });

export const register = (body: RegisterRequest) =>
  api<AuthResponse>('/auth/register', { ...post, body, auth: false });

export const refresh = (refreshToken: string) =>
  api<AuthTokens>('/auth/refresh', { ...post, body: { refreshToken }, auth: false });

export const logout = (refreshToken: string) =>
  api<void>('/auth/logout', { ...post, body: { refreshToken }, auth: false });

export const me = () => api<AuthUser>('/auth/me');

export const forgotPassword = (email: string) =>
  api<{ message: string }>('/auth/forgot-password', { ...post, body: { email }, auth: false });

export const resetPassword = (body: ResetPasswordRequest) =>
  api<void>('/auth/reset-password', { ...post, body, auth: false });

export const changePassword = (body: ChangePasswordRequest) =>
  api<void>('/auth/change-password', { ...post, body });
