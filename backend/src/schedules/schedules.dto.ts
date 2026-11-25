import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CLOCK_PATTERN } from '../common/clinic-time.js';

export const SLOT_LENGTHS = [15, 20, 30, 45, 60] as const;
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class CreateScheduleDto {
  @ApiProperty({ type: String })
  @IsUUID()
  optometristId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  branchId: string;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 6,
    description: '0 = Sunday … 6 = Saturday',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    type: String,
    example: '09:00',
    description: 'Manila time, HH:MM (24-hour).',
  })
  @Matches(CLOCK_PATTERN, { message: 'Use 24-hour time like 09:00.' })
  startTime: string;

  @ApiProperty({ type: String, example: '17:00' })
  @Matches(CLOCK_PATTERN, { message: 'Use 24-hour time like 17:00.' })
  endTime: string;

  @ApiPropertyOptional({ type: Number, enum: SLOT_LENGTHS, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsIn(SLOT_LENGTHS, { message: 'Choose 15, 20, 30, 45 or 60 minutes.' })
  slotMinutes?: number;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ type: String, example: '09:00' })
  @IsOptional()
  @Matches(CLOCK_PATTERN, { message: 'Use 24-hour time like 09:00.' })
  startTime?: string;

  @ApiPropertyOptional({ type: String, example: '17:00' })
  @IsOptional()
  @Matches(CLOCK_PATTERN, { message: 'Use 24-hour time like 17:00.' })
  endTime?: string;

  @ApiPropertyOptional({ type: Number, enum: SLOT_LENGTHS })
  @IsOptional()
  @Type(() => Number)
  @IsIn(SLOT_LENGTHS, { message: 'Choose 15, 20, 30, 45 or 60 minutes.' })
  slotMinutes?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'false pauses this block without deleting it.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListSchedulesQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  optometristId?: string;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}
