import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service.js';
import {
  emailTaken,
  phoneTaken,
  rethrowUserConflict,
} from '../common/conflicts.js';
import { hashPassword, verifyPassword } from '../common/password.js';
import { normalizePhone } from '../common/phone.js';
import { EnvironmentVariables } from '../config/env.validation.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LIMITS, RateLimitService } from '../rate-limit/rate-limit.service.js';
import {
  AuthResult,
  AuthUser,
  BranchRef,
  toUserView,
  TokenPair,
  UserView,
  UserViewRow,
  userViewSelect,
} from './auth.types.js';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto.js';
import { hashToken, TokenService } from './token.service.js';

const RESET_TOKEN_MINUTES = 30;

const invalidResetToken = () =>
  new BadRequestException({
    error: {
      code: 'invalid_or_expired_token',
      message:
        'This reset link is invalid or has expired. Please request a new one.',
    },
  });

const invalidCredentials = () =>
  new UnauthorizedException({
    error: {
      code: 'invalid_credentials',
      message: 'Incorrect email, mobile number or password.',
    },
  });

const fieldError = (field: string, message: string) =>
  new UnprocessableEntityException({
    error: {
      code: 'validation_failed',
      message: 'Please check the highlighted fields.',
      fields: { [field]: message },
    },
  });

const loginSelect = {
  ...userViewSelect,
  isActive: true,
  passwordHash: true,
} as const;

/** Login identifier → a lookup by email or by phone; null if it's neither. */
function parseIdentifier(
  raw: string,
): { email: string } | { phone: string } | null {
  const value = raw.trim();
  if (value.includes('@')) return { email: value.toLowerCase() };
  const phone = normalizePhone(value);
  return phone ? { phone } : null;
}

@Injectable()
export class AuthService {
  // Compared against when the account doesn't exist, so a missing account takes as long as a wrong password.
  private readonly dummyHash = hashPassword('ocula-timing-placeholder');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly audit: AuditService,
    private readonly limits: RateLimitService,
  ) {}

  async login(
    dto: LoginDto,
    ip: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    const where = parseIdentifier(dto.identifier ?? dto.email ?? '');
    if (!where) {
      throw fieldError(
        'identifier',
        'Enter an email or a mobile number like 0917 123 4567.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where,
      select: loginSelect,
    });
    // Count per account (so email and phone share one counter), or per typed value if no account.
    const accountKey = user
      ? `login:user:${user.id}`
      : `login:${'email' in where ? where.email : where.phone}`;
    const ipKey = `login-ip:${ip}`;
    await this.limits.assertNotLocked(accountKey);
    await this.limits.assertNotLocked(ipKey);

    const ok = user
      ? await verifyPassword(user.passwordHash, dto.password)
      : await verifyPassword(await this.dummyHash, dto.password).then(
          () => false,
        );
    if (!user || !ok) {
      await this.limits.hit(accountKey, LIMITS.loginAccount);
      await this.limits.hit(ipKey, LIMITS.loginIp);
      throw invalidCredentials();
    }
    // Only someone who knows the password learns the account is disabled.
    if (!user.isActive) {
      throw new ForbiddenException({
        error: {
          code: 'account_disabled',
          message: 'This account has been disabled. Please contact the clinic.',
        },
      });
    }

    await this.limits.clear(accountKey);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const pair = await this.tokens.issue(user, userAgent);
    if (user.role !== 'patient') {
      await this.audit.log({
        userId: user.id,
        action: 'auth.login',
        entity: 'user',
        entityId: user.id,
      });
    }
    return { ...pair, user: await this.view(user) };
  }

  /**
   * Self-registration is for patients only. Creates the login and the patient file together.
   * Staff and optometrist accounts are made by the admin.
   */
  async register(dto: RegisterDto, userAgent?: string): Promise<AuthResult> {
    const birthDate = new Date(`${dto.birthDate.slice(0, 10)}T00:00:00Z`);
    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate.getTime() >= Date.now()
    ) {
      throw fieldError('birthDate', 'Enter a date in the past.');
    }
    if (
      await this.prisma.user.findUnique({
        where: { phone: dto.phone },
        select: { id: true },
      })
    ) {
      throw phoneTaken();
    }
    if (
      dto.email &&
      (await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      }))
    ) {
      throw emailTaken();
    }

    const passwordHash = await hashPassword(dto.password);
    let user: UserViewRow;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email ?? null,
          phone: dto.phone,
          passwordHash,
          fullName: dto.fullName,
          role: 'patient',
          patient: {
            create: {
              fullName: dto.fullName,
              phone: dto.phone,
              birthDate,
              sex: dto.sex ?? null,
            },
          },
        },
        select: userViewSelect,
      });
    } catch (error) {
      rethrowUserConflict(error);
    }

    const pair = await this.tokens.issue(user, userAgent);
    return { ...pair, user: toUserView(user) };
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<TokenPair> {
    const { userId: _userId, ...pair } = await this.tokens.rotate(
      refreshToken,
      userAgent,
    );
    return pair;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  async me(userId: string): Promise<UserView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...userViewSelect, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: { code: 'unauthorized', message: 'Please log in again.' },
      });
    }
    return this.view(user);
  }

  async changePassword(
    current: AuthUser,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const userId = current.id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException();

    if (!(await verifyPassword(user.passwordHash, dto.currentPassword))) {
      throw new ForbiddenException({
        error: {
          code: 'wrong_current_password',
          message: 'Your current password is incorrect.',
          fields: { currentPassword: 'Your current password is incorrect.' },
        },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        mustChangePassword: false,
      },
    });
    // Log out everywhere else, keep this session.
    await this.tokens.revokeAllForUser(userId, current.sessionId);
  }

  /**
   * Always answers the same way, whether or not the email has an account,
   * so the form can't be used to find out who is registered.
   * Accounts without an email (phone-only patients) are reset by staff instead.
   */
  async forgotPassword(dto: ForgotPasswordDto, ip: string): Promise<void> {
    const ipKey = `reset-ip:${ip}`;
    await this.limits.assertNotLocked(ipKey);
    await this.limits.hit(ipKey, LIMITS.resetIp);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
    if (!user || !user.isActive || !user.email) return;

    // Only the newest link works.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000),
      },
    });

    const frontend = this.config
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');
    const link = `${frontend}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mail.send({
      to: user.email,
      subject: 'Reset your OCULA password',
      text:
        `Hi ${user.fullName},\n\n` +
        `Open this link to choose a new password. It works once and expires in ${RESET_TOKEN_MINUTES} minutes:\n` +
        `${link}\n\n` +
        `If you didn't ask for this, you can ignore this email.\n\nMRB Optical Clinic`,
    });
  }

  async resetPassword(dto: ResetPasswordDto, ip: string): Promise<void> {
    const ipKey = `reset-ip:${ip}`;
    await this.limits.assertNotLocked(ipKey);

    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      await this.limits.hit(ipKey, LIMITS.resetIp);
      throw invalidResetToken();
    }

    // Mark it used first, so the same link can't be used twice at the same moment.
    const claimed = await this.prisma.passwordResetToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw invalidResetToken();

    await this.prisma.user.update({
      where: { id: stored.userId },
      data: {
        passwordHash: await hashPassword(dto.newPassword),
        mustChangePassword: false,
      },
    });
    // Whoever had the old password is logged out everywhere.
    await this.tokens.revokeAllForUser(stored.userId);
  }

  /** The API's user shape; the admin is shown every branch. */
  private async view(user: UserViewRow): Promise<UserView> {
    let all: BranchRef[] | undefined;
    if (user.role === 'admin') {
      all = await this.prisma.branch.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      });
    }
    return toUserView(user, all);
  }
}
