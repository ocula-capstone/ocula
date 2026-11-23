import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination.js';

export class ListAuditLogsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Starts with, e.g. "user." or "auth.login".',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  action?: string;

  @ApiPropertyOptional({ type: String, example: 'user' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  entity?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityId?: string;

  @ApiPropertyOptional({ type: String, description: 'Who did it.' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ type: String, example: '2026-11-24T00:00:00+08:00' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ type: String, example: '2026-11-30T23:59:59+08:00' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
