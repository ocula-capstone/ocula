import { Module } from '@nestjs/common';
import {
  AppointmentsController,
  MyAppointmentsController,
} from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';

@Module({
  controllers: [MyAppointmentsController, AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
