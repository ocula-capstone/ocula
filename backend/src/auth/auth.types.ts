import type { Role } from '../generated/prisma/client.js';

/** What the access token carries. Kept small: everything else is read from the database. */
export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  sid: string; // login session (refresh token family)
}

/** The logged-in user, attached to the request by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: Role;
  sessionId: string;
}

export interface BranchRef {
  id: string;
  code: string;
  name: string;
}

/** The user shape the API returns (never includes the password hash). */
export interface UserView {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  /** Branches the person works at. Admin: all branches. Patients: none. */
  branches: BranchRef[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until the access token expires
}

export interface AuthResult extends TokenPair {
  user: UserView;
}

/** The columns a UserView needs, for Prisma `select`. */
export const userViewSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  role: true,
  mustChangePassword: true,
  branches: {
    select: { branch: { select: { id: true, code: true, name: true } } },
  },
} as const;

export interface UserViewRow {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
  branches: { branch: BranchRef }[];
}

export function toUserView(
  user: UserViewRow,
  allBranches?: BranchRef[],
): UserView {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    branches:
      user.role === 'admin' && allBranches
        ? allBranches
        : user.branches
            .map((b) => b.branch)
            .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
