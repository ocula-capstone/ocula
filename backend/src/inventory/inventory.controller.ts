import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
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
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  AdjustStockDto,
  ListInventoryQueryDto,
  ListMovementsQueryDto,
  ReceiveStockDto,
  SetReorderLevelDto,
  TransferStockDto,
} from './inventory.dto.js';
import { InventoryService } from './inventory.service.js';

/** Stock per branch. Staff only see and change their own branches; the admin sees all. */
@ApiTags('inventory')
@ApiBearerAuth()
@Roles('admin', 'staff')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @Roles('admin', 'staff', 'optometrist')
  @ApiOperation({
    summary: 'Stock rows at your branches. lowStock=true for the reorder list.',
  })
  list(@Query() query: ListInventoryQueryDto, @CurrentUser() user: AuthUser) {
    return this.inventory.list(query, user);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Stock history, newest first.' })
  movements(
    @Query() query: ListMovementsQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.inventory.movements(query, user);
  }

  @Post('receive')
  @HttpCode(200)
  @ApiConflictResponse({ description: 'not_stocked, product_inactive' })
  receive(@Body() dto: ReceiveStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.receive(dto, user);
  }

  @Post('adjust')
  @HttpCode(200)
  @ApiConflictResponse({
    description: 'insufficient_stock, not_stocked, product_inactive',
  })
  adjust(@Body() dto: AdjustStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.adjust(dto, user);
  }

  @Post('transfer')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Move stock between branches. You must work at the branch it leaves.',
  })
  @ApiConflictResponse({
    description: 'insufficient_stock, not_stocked, product_inactive',
  })
  transfer(@Body() dto: TransferStockDto, @CurrentUser() user: AuthUser) {
    return this.inventory.transfer(dto, user);
  }

  @Put('reorder-level')
  reorderLevel(@Body() dto: SetReorderLevelDto, @CurrentUser() user: AuthUser) {
    return this.inventory.setReorderLevel(dto, user);
  }
}
