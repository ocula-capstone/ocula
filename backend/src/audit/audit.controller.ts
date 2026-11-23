import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ListAuditLogsQueryDto } from './audit.dto.js';
import { AuditService } from './audit.service.js';

@ApiTags('audit')
@ApiBearerAuth()
@Roles('admin')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOkResponse({
    description: 'Newest first: { items, total, page, pageSize }. Admin only.',
  })
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.audit.list(query);
  }
}
