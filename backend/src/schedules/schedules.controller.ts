import {
  Body,
  Controller,
  Delete,
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
  ApiNoContentResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CreateScheduleDto,
  ListSchedulesQueryDto,
  UpdateScheduleDto,
} from './schedules.dto.js';
import { SchedulesService } from './schedules.service.js';

/** Optometrists' weekly hours. Staff only see and change their own branches. */
@ApiTags('schedules')
@ApiBearerAuth()
@Roles('admin', 'staff', 'optometrist')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  list(@Query() query: ListSchedulesQueryDto, @CurrentUser() user: AuthUser) {
    return this.schedules.list(query, user);
  }

  @Post()
  @Roles('admin', 'staff')
  @ApiConflictResponse({ description: 'schedule_overlap' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: AuthUser) {
    return this.schedules.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin', 'staff')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.schedules.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('admin', 'staff')
  @HttpCode(204)
  @ApiNoContentResponse({
    description: 'Removed. Existing appointments are kept.',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.schedules.remove(id, user);
  }
}
