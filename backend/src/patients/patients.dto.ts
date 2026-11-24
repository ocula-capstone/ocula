import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination.js';
import { IsPhMobile } from '../common/phone.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
/** "" from an empty form field means "not given" when creating, and "clear it" when editing. */
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Fields staff fill in on the patient file. Shared by create and edit. */
class PatientFields {
  @ApiPropertyOptional({
    type: String,
    example: '0917 123 4567',
    description: 'Contact number. Not unique.',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @IsPhMobile()
  phone?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: '1985-07-02',
    description: 'YYYY-MM-DD, in the past.',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @IsISO8601({ strict: true }, { message: 'Enter a valid date.' })
  birthDate?: string | null;

  @ApiPropertyOptional({ type: String, enum: ['male', 'female'] })
  @IsOptional()
  @Transform(emptyToNull)
  @IsIn(['male', 'female', null], { message: 'Choose male or female.' })
  sex?: 'male' | 'female' | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  occupation?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Employer, e.g. for company field work.',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  companyName?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Branch where the file was opened.',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @IsUUID()
  homeBranchId?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreatePatientDto extends PatientFields {
  @ApiProperty({ type: String, example: 'Rosa Dela Cruz' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter the full name.' })
  @MaxLength(120)
  fullName: string;
}

export class UpdatePatientDto extends PatientFields {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter the full name.' })
  @MaxLength(120)
  fullName?: string;
}

/** What a patient may change on their own file. */
export class UpdateMyPatientDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  occupation?: string | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  companyName?: string | null;
}

export class GivePortalAccessDto {
  @ApiPropertyOptional({
    type: String,
    example: '0917 123 4567',
    description:
      "The login phone. Defaults to the file's contact number. Must not be used by another account.",
  })
  @IsOptional()
  @IsString()
  @IsPhMobile()
  phone?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional; lets the patient use "Forgot password".',
  })
  @IsOptional()
  @Transform(lowerTrim)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email?: string;
}

export class ListPatientsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Name, phone, email or patient number (P-000123 or 123).',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  homeBranchId?: string;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'true: has a portal login; false: file only.',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hasAccount?: boolean;

  @ApiPropertyOptional({ type: String, description: 'Exact company name.' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  companyName?: string;
}
