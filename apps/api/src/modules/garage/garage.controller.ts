import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GarageService } from './garage.service';
import {
  CreateVehicleDto,
  MaintenanceDto,
  MileageLogDto,
  ReminderDto,
  UpdateVehicleDto,
} from './dto/vehicle.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('garage')
@Controller()
export class GarageController {
  constructor(private readonly garage: GarageService) {}

  @ApiBearerAuth()
  @Get('garage')
  list(@CurrentUser() user: AuthUser) {
    return this.garage.list(user.id);
  }

  @ApiBearerAuth()
  @Get('garage/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.garage.findOne(id, user.id);
  }

  @ApiBearerAuth()
  @Post('garage')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.garage.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Put('garage/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.garage.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Delete('garage/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.garage.remove(id, user.id);
  }

  @ApiBearerAuth()
  @Post('garage/:id/maintenance')
  addMaintenance(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MaintenanceDto,
  ) {
    return this.garage.addMaintenance(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Post('garage/:id/mileage')
  addMileage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MileageLogDto) {
    return this.garage.addMileageLog(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Post('garage/:id/reminders')
  addReminder(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReminderDto) {
    return this.garage.addReminder(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Patch('garage/reminders/:reminderId/complete')
  completeReminder(@CurrentUser() user: AuthUser, @Param('reminderId') reminderId: string) {
    return this.garage.completeReminder(reminderId, user.id);
  }
}
