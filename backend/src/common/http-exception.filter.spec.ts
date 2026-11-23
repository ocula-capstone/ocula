import {
  BadRequestException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

// Keep test output clean: the filter logs unknown errors on purpose.
Logger.overrideLogger(false);

const filter = new HttpExceptionFilter();
const prismaError = (code: string, meta?: Record<string, unknown>) =>
  Object.assign(new Error('prisma'), {
    name: 'PrismaClientKnownRequestError',
    code,
    meta,
  });

describe('HttpExceptionFilter', () => {
  it('passes through bodies that already use the error shape', () => {
    const body = {
      error: {
        code: 'validation_failed',
        message: 'Check',
        fields: { email: 'x' },
      },
    };
    expect(filter.toApiError(new UnprocessableEntityException(body))).toEqual({
      status: 422,
      body,
    });
  });

  it('wraps plain HttpExceptions with a code from the status', () => {
    expect(
      filter.toApiError(new NotFoundException('Cannot GET /api/nope')),
    ).toEqual({
      status: 404,
      body: { error: { code: 'not_found', message: 'Cannot GET /api/nope' } },
    });
    expect(filter.toApiError(new BadRequestException()).body.error.code).toBe(
      'bad_request',
    );
  });

  it('drops query strings from route-not-found messages', () => {
    const result = filter.toApiError(
      new NotFoundException('Cannot GET /api/x?token=secret'),
    );
    expect(result.body.error.message).toBe('Cannot GET /api/x');
  });

  it('turns a Prisma unique error into 409 with the field (both meta formats)', () => {
    const classic = filter.toApiError(
      prismaError('P2002', { target: ['email'] }),
    );
    expect(classic.status).toBe(409);
    expect(classic.body.error).toMatchObject({
      code: 'already_exists',
      fields: { email: 'Already in use.' },
    });

    const adapter = filter.toApiError(
      prismaError('P2002', {
        driverAdapterError: { cause: { constraint: { fields: ['"sku"'] } } },
      }),
    );
    expect(adapter.body.error.fields).toEqual({ sku: 'Already in use.' });
  });

  it('turns Prisma not-found into 404 and bad references into 409', () => {
    expect(filter.toApiError(prismaError('P2025')).status).toBe(404);
    expect(filter.toApiError(prismaError('P2003')).body.error.code).toBe(
      'invalid_reference',
    );
  });

  it('hides unknown errors behind a generic 500', () => {
    const result = filter.toApiError(new Error('secret database detail'));
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain('secret');
  });
});
