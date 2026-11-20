import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Every endpoint lives under /api, e.g. /api/auth/login
  app.setGlobalPrefix('api');

  // Which frontend addresses may call this API
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });

  // Reject bad request bodies automatically (422), keep only known fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      errorHttpStatusCode: 422,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          error: {
            code: 'validation_failed',
            message: 'Please check the highlighted fields.',
            fields: Object.fromEntries(
              errors.map((e) => [e.property, Object.values(e.constraints ?? {})[0] ?? 'Invalid']),
            ),
          },
        }),
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
