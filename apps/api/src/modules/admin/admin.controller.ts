import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, ReportStatus } from '@prisma/client';
import {
  AdminService,
  CreateReportDto,
  ResolveReportDto,
} from './admin.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('reports')
  createReport(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.admin.createReport(user.id, dto);
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('admin/stats')
  stats() {
    return this.admin.stats();
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get('admin/reports')
  reports(@Query() query: PaginationDto, @Query('status') status?: ReportStatus) {
    return this.admin.listReports(Object.assign(query, { status }));
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch('admin/reports/:id')
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.admin.resolveReport(id, user.id, dto);
  }
}
