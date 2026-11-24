import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { TooManyAttemptsException } from '../rate-limit/too-many-attempts.exception.js';

/** The one error shape every endpoint returns. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  413: 'payload_too_large',
  422: 'validation_failed',
  429: 'too_many_requests',
  503: 'service_unavailable',
};

interface PrismaKnownError {
  name: 'PrismaClientKnownRequestError';
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaKnownError(exception: unknown): exception is PrismaKnownError {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { name?: unknown }).name ===
      'PrismaClientKnownRequestError' &&
    typeof (exception as { code?: unknown }).code === 'string'
  );
}

/** Column names from a unique-constraint error, across Prisma's two meta formats. */
export function uniqueFields(
  meta: Record<string, unknown> | undefined,
): string[] {
  const target = meta?.target;
  if (Array.isArray(target)) return target.map(String);
  const fields = (
    meta?.driverAdapterError as {
      cause?: { constraint?: { fields?: unknown } };
    }
  )?.cause?.constraint?.fields;
  return Array.isArray(fields)
    ? fields.map((f) => String(f).replace(/"/g, ''))
    : [];
}

/** The human-readable message from an HttpException response. */
function messageOf(res: string | object, fallback: string): string {
  let message: unknown =
    typeof res === 'string' ? res : (res as { message?: unknown }).message;
  if (Array.isArray(message)) message = message[0];
  const text = typeof message === 'string' && message ? message : fallback;
  // Nest's "Cannot GET /path?query" — drop the query string, it may hold tokens.
  return text.replace(/^(Cannot [A-Z]+ [^?\s]*)\?\S*$/, '$1');
}

/**
 * Turns every error into `{ error: { code, message, fields? } }`.
 * - HttpExceptions keep their status; bodies already in this shape pass through.
 * - Common Prisma errors become 404 / 409 instead of 500.
 * - Anything else is logged and returned as a generic 500, so no internals leak.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toApiError(exception);
    if (exception instanceof TooManyAttemptsException) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    }
    response.status(status).json(body);
  }

  toApiError(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null && 'error' in res) {
        const error = (res as { error: unknown }).error;
        if (typeof error === 'object' && error !== null && 'code' in error) {
          return { status, body: res as ApiErrorBody };
        }
      }
      const message = messageOf(res, exception.message);
      return {
        status,
        body: { error: { code: CODE_BY_STATUS[status] ?? 'error', message } },
      };
    }

    if (isPrismaKnownError(exception)) {
      switch (exception.code) {
        case 'P2002': {
          const fields = uniqueFields(exception.meta);
          return {
            status: HttpStatus.CONFLICT,
            body: {
              error: {
                code: 'already_exists',
                message: 'A record with the same value already exists.',
                ...(fields.length
                  ? {
                      fields: Object.fromEntries(
                        fields.map((f) => [f, 'Already in use.']),
                      ),
                    }
                  : {}),
              },
            },
          };
        }
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            body: {
              error: {
                code: 'not_found',
                message: 'The record was not found.',
              },
            },
          };
        case 'P2003':
          return {
            status: HttpStatus.CONFLICT,
            body: {
              error: {
                code: 'invalid_reference',
                message:
                  'This refers to a record that does not exist or is still in use.',
              },
            },
          };
      }
    }

    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception),
    );
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'internal_error',
          message: 'Something went wrong. Please try again.',
        },
      },
    };
  }
}
