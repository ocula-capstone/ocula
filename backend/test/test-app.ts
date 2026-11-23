import {
  INestApplication,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { flattenValidationErrors } from './../src/common/validation-errors.js';
import { MailMessage, MailService } from './../src/mail/mail.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { FakePrisma } from './fake-prisma.js';

/** The real app (guards, filters, validation) on top of the in-memory database. */
export async function createTestApp(
  db: FakePrisma,
  sentMail: MailMessage[] = [],
) {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(db)
    .overrideProvider(MailService)
    .useValue({
      send: async (m: MailMessage) => {
        sentMail.push(m);
      },
    })
    .compile();

  const app: INestApplication = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  // Same pipe as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          error: {
            code: 'validation_failed',
            message: 'Please check the highlighted fields.',
            fields: flattenValidationErrors(errors),
          },
        }),
    }),
  );
  await app.init();
  return app;
}

/** Logs in and returns an Authorization header for the next requests. */
export async function bearer(
  app: INestApplication,
  email: string,
  password: string,
) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return { Authorization: `Bearer ${res.body.accessToken as string}` };
}
