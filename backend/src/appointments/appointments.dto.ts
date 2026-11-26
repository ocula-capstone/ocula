import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { DATE_PATTERN } from '../common/clinic-time.js';
import { PageQueryDto } from '../common/pagination.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const APPOINTMENT_STATUSES = [
  'pending',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
] as const;
export type AppointmentStatusName = (typeof APPOINTMENT_STATUSES)[number];

export class SlotsQueryDto {
  @ApiProperty({ type: String })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    type: String,
    example: '2026-12-01',
    description: 'Manila date, YYYY-MM-DD.',
  })
  @Matches(DATE_PATTERN, { message: 'Use a date like 2026-12-01.' })
  date: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  optometristId?: string;
}

export class CreateAppointmentDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Staff only. Patients always book for themselves.',
  })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiProperty({ type: String })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-12-01T09:30:00+08:00',
    description:
      'Start of the slot. Staff may leave it empty for a walk-in "now".',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Enter a valid date and time.' })
  startsAt?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Leave empty to take any free optometrist.',
  })
  @IsOptional()
  @IsUUID()
  optometristId?: string;

  @ApiPropertyOptional({
    type: String,
    enum: ['staff', 'walk_in'],
    description: 'Staff only. Default staff.',
  })
  @IsOptional()
  @IsIn(['staff', 'walk_in'])
  source?: 'staff' | 'walk_in';

  @ApiPropertyOptional({ type: String, example: 'Blurry vision when reading' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Staff only; never shown to the patient.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ type: String, example: '2026-12-02T10:00:00+08:00' })
  @IsISO8601({ strict: true }, { message: 'Enter a valid date and time.' })
  startsAt: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Leave empty to keep the optometrist, or take any free one.',
  })
  @IsOptional()
  @IsUUID()
  optometristId?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ type: String, example: 'Patient has a fever' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason?: string;
}

export class ListAppointmentsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-12-01',
    description: 'One Manila day.',
  })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Use a date like 2026-12-01.' })
  date?: string;

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
    example: '2026-12-07',
    description: 'To this Manila day (inclusive).',
  })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'Use a date like 2026-12-07.' })
  to?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  optometristId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ type: String, enum: APPOINTMENT_STATUSES })
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatusName;
}
