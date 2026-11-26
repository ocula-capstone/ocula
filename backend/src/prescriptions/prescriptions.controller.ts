import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CreatePrescriptionDto,
  ListPrescriptionsQueryDto,
} from './prescriptions.dto.js';
import { PrescriptionsService } from './prescriptions.service.js';

/**
 * Prescriptions are shared across branches and never edited: a correction is a new prescription.
 * Values are numbers (or null); expiresAt is a Manila date.
 */
@ApiTags('prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Post()
  @Roles('optometrist')
  @ApiCreatedResponse({
    description:
      'From a final exam { examId } or an outside prescription { patientId, type, values }.',
  })
  @ApiConflictResponse({ description: 'exam_not_final' })
  create(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: AuthUser) {
    return this.prescriptions.create(dto, user);
  }

  @Get()
  @Roles('admin', 'staff', 'optometrist')
  @ApiOkResponse({ description: 'Paged list, newest first.' })
  list(@Query() query: ListPrescriptionsQueryDto) {
    return this.prescriptions.list(query);
  }

  @Get(':id')
  @Roles('admin', 'staff', 'optometrist')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.prescriptions.get(id);
  }
}

/** The logged-in patient's own prescriptions. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('patient')
@Controller('me/prescriptions')
export class MyPrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  @ApiOkResponse({ description: 'Newest first, each with isExpired.' })
  mine(@CurrentUser() user: AuthUser) {
    return this.prescriptions.mine(user);
  }
}
