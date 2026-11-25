import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { RequestLoggerMiddleware } from './common/request-logger.middleware.js';
import { validateEnv } from './config/env.validation.js';
import { BranchesModule } from './branches/branches.module.js';
import { HealthController } from './health/health.controller.js';
import { MailModule } from './mail/mail.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RateLimitModule } from './rate-limit/rate-limit.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    MailModule,
    RateLimitModule,
    AuditModule,
    SettingsModule,
    AuthModule,
    BranchesModule,
    UsersModule,
    PatientsModule,
    SchedulesModule,
    AppointmentsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*splat}');
  }
}
