import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { flattenValidationErrors } from './common/validation-errors.js';
import { EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  // Every endpoint lives under /api, e.g. /api/auth/login
  app.setGlobalPrefix('api');

  // Which frontend addresses may call this API
  const origins = config
    .get('CORS_ORIGINS', { infer: true })
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
            fields: flattenValidationErrors(errors),
          },
        }),
    }),
  );

  // API docs at /api/docs (JSON at /api/docs-json)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OCULA API')
    .setDescription('Backend for the OCULA optical clinic system (MRB Clinic).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  // Swagger UI's CSS/JS come from a CDN: Vercel's function doesn't include them from node_modules.
  const swaggerUi = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.34.1';
  SwaggerModule.setup(
    'api/docs',
    app,
    () => SwaggerModule.createDocument(app, swaggerConfig),
    {
      customSiteTitle: 'OCULA API docs',
      customCssUrl: `${swaggerUi}/swagger-ui.css`,
      customJs: [
        `${swaggerUi}/swagger-ui-bundle.js`,
        `${swaggerUi}/swagger-ui-standalone-preset.js`,
      ],
    },
  );
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
