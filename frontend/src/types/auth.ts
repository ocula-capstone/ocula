import type { BranchRef } from '@/types/branch';

export type Role = 'admin' | 'staff' | 'optometrist' | 'patient';

export interface AuthUser {
  id: string;
  // Email is optional for patients. Phone is required for new accounts, but older ones may have none.
  email: string | null;
  phone: string | null;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  // Branches the person works at. Admin: all. Patients: none.
  branches: BranchRef[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  birthDate?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
