import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  CatalogQueryDto,
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from './products.dto.js';
import { ProductsService } from './products.service.js';

/** The product list. Everyone in the clinic reads it; only the admin changes it. */
@ApiTags('products')
@ApiBearerAuth()
@Roles('admin', 'staff', 'optometrist')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Products with stock at your branches (cost is admin only).',
  })
  list(@Query() query: ListProductsQueryDto, @CurrentUser() user: AuthUser) {
    return this.products.list(query, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.products.get(id, user);
  }

  @Post()
  @Roles('admin')
  @ApiConflictResponse({ description: 'sku_taken' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary:
      'Edit a product. The category is fixed; set isActive false to retire it.',
  })
  @ApiConflictResponse({ description: 'sku_taken' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.update(id, dto, user);
  }
}

/** The public website's frames and services pages. No login, no cost, no quantities. */
@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly products: ProductsService) {}

  @Get('products')
  @ApiOperation({
    summary: 'Active products with an in-stock flag per branch.',
  })
  list(@Query() query: CatalogQueryDto) {
    return this.products.catalog(query);
  }
}
