import { Module } from '@nestjs/common';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module.js';
import { ExamsController, MyExamsController } from './exams.controller.js';
import { ExamsService } from './exams.service.js';

@Module({
  imports: [PrescriptionsModule],
  controllers: [MyExamsController, ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
