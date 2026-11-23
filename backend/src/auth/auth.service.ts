import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service.js';
import { hashPassword, verifyPassword } from '../common/password.js';
import { EnvironmentVariables } from '../config/env.validation.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AuthResult,
  AuthUser,
  toUserView,
  TokenPair,
  UserView,
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
      message: 'Incorrect email or password.',
    },
  });

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  mustChangePassword: true,
  isActive: true,
  passwordHash: true,
} as const;

@Injectable()
export class AuthService {
  // Compared against when the email doesn't exist, so a missing account takes as long as a wrong password.
  private readonly dummyHash = hashPassword('ocula-timing-placeholder');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, userAgent?: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: userSelect,
    });
    if (!user) {
      await verifyPassword(await this.dummyHash, dto.password);
      throw invalidCredentials();
    }
    const ok = await verifyPassword(user.passwordHash, dto.password);
    if (!ok) throw invalidCredentials();
    // Only someone who knows the password learns the account is disabled.
    if (!user.isActive) {
      throw new ForbiddenException({
        error: {
          code: 'account_disabled',
          message: 'This account has been disabled. Please contact the clinic.',
        },
      });
    }

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
    return { ...pair, user: toUserView(user) };
  }

  /** Self-registration is for patients only. Staff and optometrist accounts are made by the admin. */
  async register(dto: RegisterDto, userAgent?: string): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (existing) throw this.emailTaken();

    const passwordHash = await hashPassword(dto.password);
    let user: UserView;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          role: 'patient',
          patient: { create: {} },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          mustChangePassword: true,
        },
      });
    } catch (error) {
      // Two sign-ups with the same email at the same moment.
      if ((error as { code?: string }).code === 'P2002')
        throw this.emailTaken();
      throw error;
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
      select: userSelect,
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: { code: 'unauthorized', message: 'Please log in again.' },
      });
    }
    return toUserView(user);
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
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, fullName: true, isActive: true },
    });
    if (!user || !user.isActive) return;

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

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!stored || stored.usedAt || stored.expiresAt <= new Date())
      throw invalidResetToken();

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

  private emailTaken() {
    return new ConflictException({
      error: {
        code: 'email_taken',
        message: 'An account with this email already exists.',
        fields: { email: 'An account with this email already exists.' },
      },
    });
  }
}
