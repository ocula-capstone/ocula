import { Module } from '@nestjs/common';
import {
  MyPrescriptionsController,
  PrescriptionsController,
} from './prescriptions.controller.js';
import { PrescriptionsService } from './prescriptions.service.js';

@Module({
  controllers: [MyPrescriptionsController, PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
