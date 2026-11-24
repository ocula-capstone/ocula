import { HttpException, HttpStatus } from '@nestjs/common';

/** 429 with `too_many_attempts`; the filter also sends a Retry-After header. */
export class TooManyAttemptsException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        error: {
          code: 'too_many_attempts',
          message: `Too many attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
          retryAfter: retryAfterSeconds,
        },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
