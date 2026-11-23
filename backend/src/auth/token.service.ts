import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '../generated/prisma/client.js';
import { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AccessTokenPayload, TokenPair } from './auth.types.js';

const invalidRefresh = () =>
  new UnauthorizedException({
    error: {
      code: 'invalid_refresh_token',
      message: 'Your session has ended. Please log in again.',
    },
  });

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Access tokens: short-lived JWTs (15 min).
 * Refresh tokens: random strings stored only as a SHA-256 hash. Each one works once:
 * using it revokes it and issues a new one in the same "family". If a revoked token is
 * used again (a sign it was stolen), the whole family is revoked and the user must log in.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  private get accessTtl(): number {
    return this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
  }

  private refreshExpiry(): Date {
    const days = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /** New session after login or register. */
  async issue(
    user: { id: string; role: Role },
    userAgent?: string,
  ): Promise<TokenPair> {
    return this.createPair(user, randomUUID(), userAgent);
  }

  /** Exchange a refresh token for a new pair. Returns the user id it belonged to. */
  async rotate(
    refreshToken: string,
    userAgent?: string,
  ): Promise<TokenPair & { userId: string }> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { select: { id: true, role: true, isActive: true } } },
    });
    if (!stored) throw invalidRefresh();

    if (stored.revokedAt) {
      // Reuse of an old token: end every session in this family.
      await this.revokeFamily(stored.familyId);
      throw invalidRefresh();
    }
    if (stored.expiresAt <= new Date() || !stored.user.isActive) {
      await this.revokeFamily(stored.familyId);
      throw invalidRefresh();
    }

    // Revoke the old token first, only if nobody else did in the meantime.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      await this.revokeFamily(stored.familyId);
      throw invalidRefresh();
    }

    const pair = await this.createPair(
      stored.user,
      stored.familyId,
      userAgent,
      stored.id,
    );
    return { ...pair, userId: stored.user.id };
  }

  /** Logout: revoke this session. Unknown tokens are ignored. */
  async revoke(refreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      select: { familyId: true },
    });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  /** End every session of this user, except `keepSessionId` if given. */
  async revokeAllForUser(
    userId: string,
    keepSessionId?: string,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepSessionId ? { familyId: { not: keepSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async createPair(
    user: { id: string; role: Role },
    familyId: string,
    userAgent?: string,
    previousId?: string,
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      sid: familyId,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessTtl,
    });

    const refreshToken = randomBytes(32).toString('base64url');
    const created = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId,
        expiresAt: this.refreshExpiry(),
        userAgent: userAgent?.slice(0, 255),
      },
      select: { id: true },
    });
    if (previousId) {
      await this.prisma.refreshToken.update({
        where: { id: previousId },
        data: { replacedBy: created.id },
      });
    }

    return { accessToken, refreshToken, expiresIn: this.accessTtl };
  }
}
