import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { DATE_PATTERN } from '../common/clinic-time.js';
import { PageQueryDto } from '../common/pagination.js';
import { VA_MAX_LENGTH } from '../common/refraction.js';
import {
  RxOptionsDto,
  RxValuesDto,
  trim,
} from '../prescriptions/prescriptions.dto.js';

export const EXAM_STATUSES = ['draft', 'final'] as const;
export type ExamStatusName = (typeof EXAM_STATUSES)[number];

const vaMessage = `Use at most ${VA_MAX_LENGTH} characters, like 20/20 or 6/6.`;

/** The clinical part of an exam. Editable while it is a draft; null clears a value. */
export class ExamValuesDto extends RxValuesDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Blurry vision when reading',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  chiefComplaint?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '20/20' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(VA_MAX_LENGTH, { message: vaMessage })
  odVa?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '20/25' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(VA_MAX_LENGTH, { message: vaMessage })
  osVa?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  diagnosis?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  recommendations?: string | null;
}

export class CreateExamDto extends ExamValuesDto {
  @ApiProperty({ type: String })
  @IsUUID()
  patientId: string;

  @ApiProperty({ type: String, description: 'A branch you are assigned to.' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({
    type: String,
    description: "The patient's checked-in or completed visit at this branch.",
  })
  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}

export class UpdateExamDto extends ExamValuesDto {}

export class FinalizeExamDto extends RxOptionsDto {
  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Also issue a prescription from the exam values.',
  })
  @IsOptional()
  @IsBoolean()
  createPrescription?: boolean;
}

export class ListExamsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  optometristId?: string;

  @ApiPropertyOptional({ type: String, enum: EXAM_STATUSES })
  @IsOptional()
  @IsIn(EXAM_STATUSES)
  status?: ExamStatusName;

  @ApiPropertyOptional({
    type: String,
    example: '2026-12-01',
    description: 'From this Manila day (inclusive).',
  })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Use a date like 2026-12-01.' })
  from?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-12-31',
    description: 'To this Manila day (inclusive).',
  })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Use a date like 2026-12-31.' })
  to?: string;
}

/** Image types accepted for a paper-record photo, with the file extension used in Storage. */
export const EXAM_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;
export type ExamImageType = keyof typeof EXAM_IMAGE_TYPES;
export const EXAM_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export class ExamImageUploadDto {
  @ApiProperty({
    type: String,
    enum: Object.keys(EXAM_IMAGE_TYPES),
    example: 'image/jpeg',
  })
  @IsIn(Object.keys(EXAM_IMAGE_TYPES), {
    message: 'Use a JPEG, PNG or WebP photo.',
  })
  contentType: ExamImageType;
}

export class SetExamImageDto {
  @ApiProperty({
    type: String,
    description: 'The path returned by POST /exams/:id/image/upload-url.',
  })
  @IsString()
  @MaxLength(200)
  path: string;
}
