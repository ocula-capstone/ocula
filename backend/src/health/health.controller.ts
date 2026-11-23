import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ description: 'The API and the database are reachable.' })
  @ApiServiceUnavailableResponse({
    description: 'The database cannot be reached.',
  })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        error: {
          code: 'database_unavailable',
          message: 'The database cannot be reached.',
        },
      });
    }
    return { status: 'ok', database: 'up', time: new Date().toISOString() };
  }
}
