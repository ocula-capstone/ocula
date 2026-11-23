import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hashPassword, verifyPassword } from '../common/password.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthResult, toUserView, TokenPair, UserView } from './auth.types.js';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto.js';
import { TokenService } from './token.service.js';

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
    if (!ok || !user.isActive) throw invalidCredentials();

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const pair = await this.tokens.issue(user, userAgent);
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

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
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
