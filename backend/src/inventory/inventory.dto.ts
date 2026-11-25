import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';
import { PageQueryDto } from '../common/pagination.js';
import {
  PRODUCT_CATEGORIES,
  type ProductCategoryName,
} from '../products/products.dto.js';

export const MOVEMENT_TYPES = [
  'receive',
  'sale',
  'adjustment',
  'return',
  'transfer_in',
  'transfer_out',
] as const;
export type MovementTypeName = (typeof MOVEMENT_TYPES)[number];

const MAX_QTY = 10_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class ListInventoryQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: 'One branch. Leave out for all your branches.',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

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

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Only rows at or below their reorder level.',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Leave out to include retired products too.',
  })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;
}

export class ReceiveStockDto {
  @ApiProperty({ type: String })
  @IsUUID()
  branchId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  productId: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: MAX_QTY, example: 10 })
  @Type(() => Number)
  @IsInt({ message: 'Enter a whole number.' })
  @Min(1)
  @Max(MAX_QTY)
  quantity: number;

  @ApiPropertyOptional({
    type: String,
    example: 'Delivery from supplier, DR #1234',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class AdjustStockDto {
  @ApiProperty({ type: String })
  @IsUUID()
  branchId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  productId: string;

  @ApiProperty({
    type: Number,
    example: -1,
    description: 'Positive adds, negative removes. Not 0.',
  })
  @Type(() => Number)
  @IsInt({ message: 'Enter a whole number.' })
  @NotEquals(0, { message: 'Enter a change other than 0.' })
  @Min(-MAX_QTY)
  @Max(MAX_QTY)
  quantityChange: number;

  @ApiProperty({ type: String, example: 'Broken during fitting' })
  @Transform(trim)
  @IsString()
  @MinLength(3, { message: 'Say why the stock changed.' })
  @MaxLength(200)
  reason: string;
}

export class TransferStockDto {
  @ApiProperty({ type: String })
  @IsUUID()
  fromBranchId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  toBranchId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  productId: string;

  @ApiProperty({ type: Number, minimum: 1, maximum: MAX_QTY, example: 2 })
  @Type(() => Number)
  @IsInt({ message: 'Enter a whole number.' })
  @Min(1)
  @Max(MAX_QTY)
  quantity: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class SetReorderLevelDto {
  @ApiProperty({ type: String })
  @IsUUID()
  branchId: string;

  @ApiProperty({ type: String })
  @IsUUID()
  productId: string;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 1000,
    example: 3,
    description: 'Low stock when the quantity is at or below this.',
  })
  @Type(() => Number)
  @IsInt({ message: 'Enter a whole number.' })
  @Min(0)
  @Max(1000)
  reorderLevel: number;
}

export class ListMovementsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ type: String, enum: MOVEMENT_TYPES })
  @IsOptional()
  @IsIn(MOVEMENT_TYPES, { message: 'Choose a valid movement type.' })
  type?: MovementTypeName;

  @ApiPropertyOptional({
    type: String,
    example: '2026-12-01',
    description: 'From this Manila day.',
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
