import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  // Stand-in for the database so this test runs without Supabase.
  const prisma = { $queryRaw: jest.fn(), $disconnect: jest.fn() };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/health returns ok when the database answers', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('GET /api/health returns 503 when the database is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);
    expect(res.body).toMatchObject({ error: { code: 'database_unavailable' } });
  });

  afterEach(async () => {
    await app.close();
  });
});
