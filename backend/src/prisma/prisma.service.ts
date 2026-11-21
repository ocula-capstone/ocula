import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EnvironmentVariables } from '../config/env.validation.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * The database client for the whole app. Inject it in any service:
 * `constructor(private readonly prisma: PrismaService) {}`.
 * Connects lazily on the first query, which suits Vercel's serverless functions.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
