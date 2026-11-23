import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UpdateSettingsDto } from './settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles('admin', 'staff', 'optometrist')
  @ApiOkResponse({ description: 'Clinic settings. Clinic accounts only.' })
  get() {
    return this.settings.get();
  }

  @Patch()
  @Roles('admin')
  @ApiOkResponse({ description: 'Updated settings. Admin only.' })
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() actor: AuthUser) {
    return this.settings.update(dto, actor.id);
  }
}
