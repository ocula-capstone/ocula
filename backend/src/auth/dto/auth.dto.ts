import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsPhMobile } from '../../common/phone.js';

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class LoginDto {
  @ApiProperty({
    type: String,
    example: '09171234567',
    description:
      'Email or mobile number. A value with @ is an email; anything else is a phone.',
  })
  @ValidateIf((o: LoginDto) => o.email === undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter your email or mobile number.' })
  @MaxLength(254)
  identifier?: string;

  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description:
      'Old name for identifier (email only). Still accepted for now.',
  })
  @IsOptional()
  @Transform(lowerTrim)
  @IsString()
  @MaxLength(254)
  email?: string;

  @ApiProperty({ type: String, example: 'my-password' })
  @IsString()
  @IsNotEmpty({ message: 'Enter your password.' })
  password: string;
}

export class RegisterDto {
  @ApiProperty({ type: String, example: 'Juan Dela Cruz' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter your full name.' })
  @MaxLength(120)
  fullName: string;

  @ApiProperty({
    type: String,
    example: '0917 123 4567',
    description: 'Saved as +639XXXXXXXXX.',
  })
  @IsString()
  @IsPhMobile()
  phone: string;

  @ApiPropertyOptional({ type: String, example: 'juan@example.com' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Transform(lowerTrim)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  email?: string;

  @ApiProperty({ type: String, minLength: 8, example: 'a-strong-password' })
  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(128, { message: 'Use at most 128 characters.' })
  password: string;

  @ApiProperty({
    type: String,
    example: '1990-05-21',
    description: 'YYYY-MM-DD, in the past.',
  })
  @IsISO8601({ strict: true }, { message: 'Enter a valid date.' })
  birthDate: string;

  @ApiPropertyOptional({ type: String, enum: ['male', 'female'] })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['male', 'female'], { message: 'Choose male or female.' })
  sex?: 'male' | 'female';
}

export class RefreshDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty({ message: 'Enter your current password.' })
  currentPassword: string;

  @ApiProperty({ type: String, minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(128, { message: 'Use at most 128 characters.' })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ type: String, example: 'juan@example.com' })
  @Transform(lowerTrim)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ type: String, description: 'The token from the reset link.' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ type: String, minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(128, { message: 'Use at most 128 characters.' })
  newPassword: string;
}
