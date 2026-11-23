import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The browser or app that made the request, saved with each login session.
 * A custom decorator (not @Headers) so Swagger doesn't show it as a required field.
 */
export const UserAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<Request>().headers['user-agent'],
);
