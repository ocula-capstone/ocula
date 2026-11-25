import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DATE_PATTERN } from '../common/clinic-time.js';
import { PageQueryDto } from '../common/pagination.js';
import { AXIS_MAX, AXIS_MIN, IsRefraction } from '../common/refraction.js';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const PRESCRIPTION_TYPES = ['spectacles', 'contact_lens'] as const;
export type PrescriptionTypeName = (typeof PRESCRIPTION_TYPES)[number];

const axisMessage = `Use a whole number from ${AXIS_MIN} to ${AXIS_MAX}.`;

/** Refraction values shared by exams and prescriptions. Null (or missing) means empty. */
export class RxValuesDto {
  @ApiPropertyOptional({ type: Number, nullable: true, example: -1.25 })
  @IsOptional()
  @IsRefraction('sphere')
  odSphere?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: -0.5 })
  @IsOptional()
  @IsRefraction('cylinder')
  odCylinder?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 180 })
  @IsOptional()
  @IsInt({ message: axisMessage })
  @Min(AXIS_MIN, { message: axisMessage })
  @Max(AXIS_MAX, { message: axisMessage })
  odAxis?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 1.5 })
  @IsOptional()
  @IsRefraction('add')
  odAdd?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: -1 })
  @IsOptional()
  @IsRefraction('sphere')
  osSphere?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsRefraction('cylinder')
  osCylinder?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsInt({ message: axisMessage })
  @Min(AXIS_MIN, { message: axisMessage })
  @Max(AXIS_MAX, { message: axisMessage })
  osAxis?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsRefraction('add')
  osAdd?: number | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 62.5,
    description: 'Pupillary distance in mm.',
  })
  @IsOptional()
  @IsRefraction('pd')
  pd?: number | null;
}

/** Options for a prescription issued from an exam (also used by finalize). */
export class RxOptionsDto {
  @ApiPropertyOptional({
    type: String,
    enum: PRESCRIPTION_TYPES,
    description: 'Default spectacles.',
  })
  @IsOptional()
  @IsIn(PRESCRIPTION_TYPES)
  type?: PrescriptionTypeName;

  @ApiPropertyOptional({
    type: String,
    example: '2027-11-25',
    description: 'Manila date. Default: one year after the exam date.',
  })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Use a date like 2027-11-25.' })
  expiresAt?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

/**
 * Either { examId } (values copied from a final exam) or an outside prescription
 * { patientId, type, values } that the patient brought in.
 */
export class CreatePrescriptionDto extends RxValuesDto {
  @ApiPropertyOptional({
    type: String,
    description: 'A final exam. Values and patient are taken from it.',
  })
  @IsOptional()
  @IsUUID()
  examId?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Outside prescriptions only.',
  })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({
    type: String,
    enum: PRESCRIPTION_TYPES,
    description: 'Required for outside prescriptions; default spectacles.',
  })
  @IsOptional()
  @IsIn(PRESCRIPTION_TYPES)
  type?: PrescriptionTypeName;

  @ApiPropertyOptional({ type: String, example: '2027-11-25' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Use a date like 2027-11-25.' })
  expiresAt?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ListPrescriptionsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  examId?: string;
}
