import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Logs one line per request: method, path, status and time, e.g. `GET /api/health 200 12ms`.
 * Never logs bodies, headers or query strings, since they can hold passwords, tokens or patient data.
 * On Vercel these lines appear under the project's Logs tab.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const start = performance.now();
    res.on('finish', () => {
      const ms = Math.round(performance.now() - start);
      const path = req.originalUrl.split('?')[0];
      const line = `${req.method} ${path} ${res.statusCode} ${ms}ms`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else this.logger.log(line);
    });
    next();
  }
}
