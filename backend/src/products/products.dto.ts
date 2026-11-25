import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination.js';

export const PRODUCT_CATEGORIES = [
  'frame',
  'lens',
  'contact_lens',
  'accessory',
  'solution',
  'service',
] as const;
export type ProductCategoryName = (typeof PRODUCT_CATEGORIES)[number];

/** Frame details. They are only kept when the category is frame. */
export const FRAME_FIELDS = [
  'frameModel',
  'frameColor',
  'frameSize',
  'frameMaterial',
  'frameShape',
] as const;
export type FrameField = (typeof FRAME_FIELDS)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const upperTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

const MONEY = { maxDecimalPlaces: 2 };
const MAX_MONEY = 99_999_999.99;

/** SKU: letters, numbers and dashes, stored in capitals, e.g. "FR-RB-2140". */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,39}$/;

export class CreateProductDto {
  @ApiProperty({ type: String, example: 'FR-RB-2140' })
  @Transform(upperTrim)
  @Matches(SKU_PATTERN, {
    message: 'Use 2–40 letters, numbers or dashes, e.g. FR-RB-2140.',
  })
  sku: string;

  @ApiProperty({ type: String, example: 'Ray-Ban Wayfarer' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ type: String, enum: PRODUCT_CATEGORIES })
  @IsIn(PRODUCT_CATEGORIES, { message: 'Choose a valid category.' })
  category: ProductCategoryName;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  brand?: string | null;

  @ApiProperty({
    type: Number,
    example: 3500,
    description: 'Selling price in PHP.',
  })
  @Type(() => Number)
  @IsNumber(MONEY, { message: 'Enter an amount with at most 2 decimals.' })
  @Min(0)
  @Max(MAX_MONEY)
  price: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Buying cost in PHP. Only the admin sees it.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(MONEY, { message: 'Enter an amount with at most 2 decimals.' })
  @Min(0)
  @Max(MAX_MONEY)
  cost?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'RB2140' })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  frameModel?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Black' })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  frameColor?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '52-18-140',
    description: 'Lens width - bridge - temple, in mm.',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  frameSize?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Acetate' })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  frameMaterial?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Square' })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  frameShape?: string | null;
}

/** Everything except the category can change. Send "" or null to clear an optional field. */
export class UpdateProductDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(upperTrim)
  @Matches(SKU_PATTERN, {
    message: 'Use 2–40 letters, numbers or dashes, e.g. FR-RB-2140.',
  })
  sku?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  brand?: string | null;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(MONEY, { message: 'Enter an amount with at most 2 decimals.' })
  @Min(0)
  @Max(MAX_MONEY)
  price?: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(MONEY, { message: 'Enter an amount with at most 2 decimals.' })
  @Min(0)
  @Max(MAX_MONEY)
  cost?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  frameModel?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  frameColor?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  frameSize?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  frameMaterial?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  frameShape?: string | null;
}

export class ListProductsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Name, SKU, brand or frame model.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ type: String, enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES, { message: 'Choose a valid category.' })
  category?: ProductCategoryName;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}

export class CatalogQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'Name, brand or frame model.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  search?: string;

  @ApiPropertyOptional({ type: String, enum: PRODUCT_CATEGORIES })
  @IsOptional()
  @IsIn(PRODUCT_CATEGORIES, { message: 'Choose a valid category.' })
  category?: ProductCategoryName;

  @ApiPropertyOptional({
    type: String,
    description: 'Only products in stock at this branch.',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
