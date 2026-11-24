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
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CreatePatientDto,
  GivePortalAccessDto,
  ListPatientsQueryDto,
  UpdateMyPatientDto,
  UpdatePatientDto,
} from './patients.dto.js';
import { PatientsService } from './patients.service.js';

/** Patient files, for clinic accounts. Shared by both branches. */
@ApiTags('patients')
@ApiBearerAuth()
@Roles('admin', 'staff', 'optometrist')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @ApiOkResponse({
    description: 'Paged list: { items, total, page, pageSize }.',
  })
  list(@Query() query: ListPatientsQueryDto) {
    return this.patients.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.patients.get(id);
  }

  @Post()
  @ApiCreatedResponse({ description: 'A new patient file, without a login.' })
  create(@Body() dto: CreatePatientDto, @CurrentUser() actor: AuthUser) {
    return this.patients.create(dto, actor.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.patients.update(id, dto, actor.id);
  }

  @Post(':id/portal-access')
  @Roles('admin', 'staff')
  @ApiCreatedResponse({
    description:
      'Creates the login. Returns the file and a one-time temporaryPassword.',
  })
  @ApiConflictResponse({
    description: 'already_has_account, phone_taken or email_taken',
  })
  givePortalAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GivePortalAccessDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.patients.givePortalAccess(id, dto, actor.id);
  }

  @Post(':id/reset-password')
  @Roles('admin', 'staff')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'A new one-time temporaryPassword; the patient is logged out.',
  })
  @ApiConflictResponse({ description: 'no_account' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.patients.resetPassword(id, actor.id);
  }
}

/** The logged-in patient's own file. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('patient')
@Controller('me/patient')
export class MyPatientController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @ApiOkResponse({ description: 'Your patient file (without staff notes).' })
  get(@CurrentUser() user: AuthUser) {
    return this.patients.getMine(user.id);
  }

  @Patch()
  @ApiOkResponse({ description: 'Update your address, occupation or company.' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMyPatientDto) {
    return this.patients.updateMine(user.id, dto);
  }
}
