import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateBranchDto } from './branches.dto.js';
import { BranchesService } from './branches.service.js';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @ApiOkResponse({ description: 'Both clinic branches. Any logged-in user.' })
  list() {
    return this.branches.list();
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ description: 'Updated branch. Admin only.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.branches.update(id, dto, actor.id);
  }
}
