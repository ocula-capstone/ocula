import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type {
  AuthResult,
  AuthUser,
  TokenPair,
  UserView,
} from './auth.types.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { UserAgent } from './decorators/user-agent.decorator.js';
import { ClientIp } from '../common/client-ip.decorator.js';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Tokens and the user.' })
  @ApiUnauthorizedResponse({ description: 'invalid_credentials' })
  @ApiTooManyRequestsResponse({
    description: 'too_many_attempts, with a Retry-After header (seconds)',
  })
  login(
    @Body() dto: LoginDto,
    @ClientIp() ip: string,
    @UserAgent() userAgent?: string,
  ): Promise<AuthResult> {
    return this.auth.login(dto, ip, userAgent);
  }

  @Public()
  @Post('register')
  @ApiCreatedResponse({
    description: 'New patient account, already logged in.',
  })
  @ApiConflictResponse({ description: 'email_taken' })
  register(
    @Body() dto: RegisterDto,
    @UserAgent() userAgent?: string,
  ): Promise<AuthResult> {
    return this.auth.register(dto, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'A new token pair. The old refresh token stops working.',
  })
  @ApiUnauthorizedResponse({ description: 'invalid_refresh_token' })
  refresh(
    @Body() dto: RefreshDto,
    @UserAgent() userAgent?: string,
  ): Promise<TokenPair> {
    return this.auth.refresh(dto.refreshToken, userAgent);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Session ended.' })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'The logged-in user.' })
  @ApiUnauthorizedResponse({ description: 'unauthorized' })
  me(@CurrentUser() user: AuthUser): Promise<UserView> {
    return this.auth.me(user.id);
  }

  @Post('change-password')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: 'Password changed; mustChangePassword is now false.',
  })
  @ApiForbiddenResponse({ description: 'wrong_current_password' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @ApiAcceptedResponse({
    description: 'Same answer whether or not the email has an account.',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @ClientIp() ip: string,
  ): Promise<{ message: string }> {
    await this.auth.forgotPassword(dto, ip);
    return {
      message:
        'If an account exists for this email, we sent a link to reset the password.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @ApiNoContentResponse({
    description: 'Password changed; all sessions are logged out.',
  })
  @ApiBadRequestResponse({ description: 'invalid_or_expired_token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @ClientIp() ip: string,
  ): Promise<void> {
    await this.auth.resetPassword(dto, ip);
  }
}
