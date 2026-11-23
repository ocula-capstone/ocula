import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    type: Number,
    enum: [6, 12, 24],
    description: 'Months after the last exam.',
  })
  @IsOptional()
  @IsIn([6, 12, 24], { message: 'Choose 6, 12 or 24 months.' })
  recallIntervalMonths?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  recallWindowDays?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  forcePasswordChange?: boolean;
}
