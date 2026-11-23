import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AccessTokenPayload, AuthUser } from '../auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

const unauthorized = () =>
  new UnauthorizedException({
    error: { code: 'unauthorized', message: 'Please log in again.' },
  });

/**
 * Runs on every route. Requires `Authorization: Bearer <access token>` unless the route is @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw unauthorized();

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw unauthorized();
    }
  }
}
