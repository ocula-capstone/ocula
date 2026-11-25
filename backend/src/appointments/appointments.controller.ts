import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CancelAppointmentDto,
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  RescheduleAppointmentDto,
  SlotsQueryDto,
} from './appointments.dto.js';
import { AppointmentsService } from './appointments.service.js';

/**
 * Appointments. Clinic accounts see their own branches; patients book and manage their own.
 * All times are real instants (ISO 8601); dates in queries are Manila dates.
 */
@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('slots')
  @ApiOkResponse({
    description:
      "One day's slots per optometrist, each with available: true/false.",
  })
  @ApiForbiddenResponse({
    description: 'booking_disabled (patients) or branch_forbidden (staff)',
  })
  slots(@Query() query: SlotsQueryDto, @CurrentUser() user: AuthUser) {
    return this.appointments.slots(query, user);
  }

  @Get()
  @Roles('admin', 'staff', 'optometrist')
  @ApiOkResponse({
    description: 'Paged list, soonest first: { items, total, page, pageSize }.',
  })
  list(
    @Query() query: ListAppointmentsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.list(query, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.appointments.get(id, user);
  }

  @Post()
  @Roles('admin', 'staff', 'patient')
  @ApiCreatedResponse({
    description:
      'Patients: pending, must match an open slot. Staff: confirmed; walk-ins may omit startsAt.',
  })
  @ApiConflictResponse({ description: 'slot_taken or patient_busy' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.appointments.create(dto, user);
  }

  @Patch(':id/reschedule')
  @Roles('admin', 'staff', 'patient')
  @ApiConflictResponse({
    description: 'invalid_status, slot_taken or patient_busy',
  })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.reschedule(id, dto, user);
  }

  @Post(':id/cancel')
  @Roles('admin', 'staff', 'patient')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.cancel(id, dto, user);
  }

  @Post(':id/confirm')
  @Roles('admin', 'staff')
  @HttpCode(200)
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.confirm(id, user);
  }

  @Post(':id/check-in')
  @Roles('admin', 'staff')
  @HttpCode(200)
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.checkIn(id, user);
  }

  @Post(':id/complete')
  @Roles('admin', 'staff', 'optometrist')
  @HttpCode(200)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.complete(id, user);
  }

  @Post(':id/no-show')
  @Roles('admin', 'staff')
  @HttpCode(200)
  noShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.appointments.noShow(id, user);
  }
}

/** The logged-in patient's own appointments. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('patient')
@Controller('me/appointments')
export class MyAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @ApiOkResponse({
    description:
      '{ upcoming: [...soonest first], past: [...latest first, max 50] }',
  })
  mine(@CurrentUser() user: AuthUser) {
    return this.appointments.mine(user);
  }
}
