import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TooManyAttemptsException } from './too-many-attempts.exception.js';

export interface LimitRule {
  /** Failed attempts allowed inside the window. */
  max: number;
  windowMinutes: number;
  /** How long the key stays locked once `max` is reached. */
  lockMinutes: number;
}

export const LIMITS = {
  /** Per account: 5 wrong passwords in 15 minutes locks that login for 15 minutes. */
  loginAccount: { max: 5, windowMinutes: 15, lockMinutes: 15 },
  /** Per network address: stops one device guessing many accounts. */
  loginIp: { max: 30, windowMinutes: 15, lockMinutes: 15 },
  /** Forgot-password and reset-password requests per network address. */
  resetIp: { max: 10, windowMinutes: 15, lockMinutes: 15 },
} satisfies Record<string, LimitRule>;

/**
 * Failed-attempt counters kept in the database, so they work across Vercel's
 * serverless instances. Counts are approximate under heavy concurrency, which is fine here.
 */
@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws 429 too_many_attempts if the key is locked right now. */
  async assertNotLocked(key: string): Promise<void> {
    const row = await this.prisma.rateLimit.findUnique({ where: { key } });
    const now = Date.now();
    if (row?.lockedUntil && row.lockedUntil.getTime() > now) {
      throw new TooManyAttemptsException(
        Math.ceil((row.lockedUntil.getTime() - now) / 1000),
      );
    }
  }

  /** Counts one attempt; locks the key when the rule's limit is reached. */
  async hit(key: string, rule: LimitRule): Promise<void> {
    const now = new Date();
    const row = await this.prisma.rateLimit.findUnique({ where: { key } });
    const windowOver =
      !row ||
      now.getTime() - row.windowStart.getTime() > rule.windowMinutes * 60_000;
    const count = windowOver ? 1 : row.count + 1;
    const lockedUntil =
      count >= rule.max
        ? new Date(now.getTime() + rule.lockMinutes * 60_000)
        : null;
    await this.prisma.rateLimit.upsert({
      where: { key },
      create: { key, count, windowStart: now, lockedUntil },
      update: {
        count,
        windowStart: windowOver ? now : row.windowStart,
        lockedUntil,
      },
    });
  }

  /** Forget a key, e.g. after a successful login. */
  async clear(key: string): Promise<void> {
    await this.prisma.rateLimit.deleteMany({ where: { key } });
  }
}
