import { Body, Controller, Delete, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ServiceDto, ServicesService, WorkingHourDto } from './services.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('services')
@ApiBearerAuth()
@Roles(Role.BUSINESS, Role.ADMIN)
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  add(@CurrentUser() user: AuthUser, @Body() dto: ServiceDto) {
    return this.services.addService(user.id, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: Partial<ServiceDto>) {
    return this.services.updateService(id, user.id, user.role, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.services.removeService(id, user.id, user.role);
  }

  @Put('working-hours/set')
  setHours(@CurrentUser() user: AuthUser, @Body() body: { hours: WorkingHourDto[] }) {
    return this.services.setWorkingHours(user.id, body.hours ?? []);
  }
}
