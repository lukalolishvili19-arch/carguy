import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BookingService } from './booking.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('booking')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get()
  myBookings(@CurrentUser() user: AuthUser, @Query() query: QueryBookingDto) {
    return this.booking.myBookings(user.id, query);
  }

  @Roles(Role.BUSINESS, Role.ADMIN)
  @Get('business')
  businessBookings(@CurrentUser() user: AuthUser, @Query() query: QueryBookingDto) {
    return this.booking.businessBookings(user.id, user.role, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    return this.booking.create(user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.booking.updateStatus(id, user.id, user.role, dto);
  }
}
