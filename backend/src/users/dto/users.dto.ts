import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../../common/pagination.js';

/** Roles the admin can give. There is only one admin, so 'admin' is never accepted here. */
export const STAFF_ROLES = ['staff', 'optometrist'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class CreateUserDto {
  @ApiProperty({ example: 'maria.santos@gmail.com' })
  @Transform(lowerTrim)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Maria Santos' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter the full name.' })
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES, { message: 'Choose staff or optometrist.' })
  role: StaffRole;

  @ApiProperty({
    type: [String],
    description: 'Branch ids this person works at (one or both).',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one branch.' })
  @ArrayUnique()
  @IsUUID('all', { each: true })
  branchIds: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ enum: STAFF_ROLES })
  @IsOptional()
  @IsIn(STAFF_ROLES, { message: 'Choose staff or optometrist.' })
  role?: StaffRole;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one branch.' })
  @ArrayUnique()
  @IsUUID('all', { each: true })
  branchIds?: string[];

  @ApiPropertyOptional({
    description: 'false disables the account and logs it out everywhere.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListUsersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['admin', ...STAFF_ROLES] })
  @IsOptional()
  @IsIn(['admin', ...STAFF_ROLES])
  role?: 'admin' | StaffRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Matches name or email.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBool)
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
