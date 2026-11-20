import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI settings (migrate, generate, seed). The running app connects in src/prisma/prisma.service.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations use the direct (session) connection, not the pooled one.
    // `?? ''` lets `prisma generate` run in CI and on Vercel without a database.
    url: process.env.DIRECT_URL ?? '',
  },
});
