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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CreateExamDto,
  ExamImageUploadDto,
  FinalizeExamDto,
  ListExamsQueryDto,
  SetExamImageDto,
  UpdateExamDto,
} from './exams.dto.js';
import { ExamsService } from './exams.service.js';

/**
 * Eye exams: a draft is filled in by its optometrist, then finalized (signed) and never edited.
 * Final exams are shared across branches; a draft is seen only by its optometrist and the admin.
 */
@ApiTags('exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Post()
  @Roles('optometrist')
  @ApiCreatedResponse({ description: 'A new draft exam (source manual).' })
  @ApiForbiddenResponse({ description: 'branch_forbidden' })
  @ApiConflictResponse({
    description: 'appointment_has_exam or invalid_status',
  })
  create(@Body() dto: CreateExamDto, @CurrentUser() user: AuthUser) {
    return this.exams.create(dto, user);
  }

  @Get()
  @Roles('admin', 'staff', 'optometrist')
  @ApiOkResponse({ description: 'Paged list, newest first.' })
  list(@Query() query: ListExamsQueryDto, @CurrentUser() user: AuthUser) {
    return this.exams.list(query, user);
  }

  @Get(':id')
  @Roles('admin', 'staff', 'optometrist')
  @ApiOkResponse({ description: 'The exam with its prescriptions.' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.exams.get(id, user);
  }

  @Patch(':id')
  @Roles('optometrist')
  @ApiForbiddenResponse({ description: 'not_your_exam' })
  @ApiConflictResponse({ description: 'exam_final' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('optometrist')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Draft deleted.' })
  @ApiForbiddenResponse({ description: 'not_your_exam' })
  @ApiConflictResponse({ description: 'exam_final' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.remove(id, user);
  }

  @Post(':id/image/upload-url')
  @Roles('optometrist')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Step 1 of 2. PUT the photo to uploadUrl (Content-Type = contentType), then call PUT /exams/:id/image with path.',
  })
  @ApiForbiddenResponse({ description: 'not_your_exam' })
  @ApiConflictResponse({ description: 'exam_final' })
  imageUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExamImageUploadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.imageUploadUrl(id, dto, user);
  }

  @Put(':id/image')
  @Roles('optometrist')
  @ApiOkResponse({
    description:
      'Step 2 of 2. Attaches the uploaded photo (replaces any old one).',
  })
  setImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetExamImageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.setImage(id, dto, user);
  }

  @Delete(':id/image')
  @Roles('optometrist')
  @HttpCode(204)
  removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.removeImage(id, user);
  }

  @Get(':id/image')
  @Roles('admin', 'staff', 'optometrist')
  @ApiOkResponse({
    description: '{ url, expiresIn }: a signed link valid for 5 minutes.',
  })
  imageUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.imageUrl(id, user);
  }

  @Post(':id/finalize')
  @Roles('optometrist')
  @HttpCode(200)
  @ApiOkResponse({
    description:
      'Final exam. With createPrescription: true it also has the new prescription.',
  })
  @ApiForbiddenResponse({ description: 'not_your_exam' })
  @ApiConflictResponse({ description: 'exam_final' })
  finalize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinalizeExamDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.exams.finalize(id, dto, user);
  }
}

/** The logged-in patient's own final exams. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('patient')
@Controller('me/exams')
export class MyExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @ApiOkResponse({ description: 'Final exams only, newest first.' })
  mine(@CurrentUser() user: AuthUser) {
    return this.exams.mine(user);
  }
}
