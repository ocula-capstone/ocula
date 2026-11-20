import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

/** Every value the app reads from .env (or Vercel's environment settings). */
export class EnvironmentVariables {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  PORT = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  DIRECT_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  ACCESS_TOKEN_TTL_SECONDS = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS = 7;

  @IsString()
  CORS_ORIGINS = 'http://localhost:5173';

  @IsString()
  FRONTEND_URL = 'http://localhost:5173';

  @IsOptional()
  @IsString()
  MAIL_USER?: string;

  @IsOptional()
  @IsString()
  MAIL_APP_PASSWORD?: string;

  @IsOptional()
  @IsString()
  MAIL_FROM?: string;
}

/** Stops the app at startup with a clear message if a required value is missing or wrong. */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const problems = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(
      `Invalid environment variables (check backend/.env):\n${problems}`,
    );
  }
  return env;
}
