import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
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
import {
  ChangePasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
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
  login(
    @Body() dto: LoginDto,
    @UserAgent() userAgent?: string,
  ): Promise<AuthResult> {
    return this.auth.login(dto, userAgent);
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
    await this.auth.changePassword(user.id, dto);
  }
}
