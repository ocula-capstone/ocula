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

/** The user shape the API returns (never includes the password hash). */
export interface UserView {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until the access token expires
}

export interface AuthResult extends TokenPair {
  user: UserView;
}

export function toUserView(user: UserView): UserView {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}
