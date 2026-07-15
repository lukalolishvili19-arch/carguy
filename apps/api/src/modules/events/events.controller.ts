import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RsvpStatus } from '@prisma/client';
import { CreateEventDto, EventsService, QueryEventDto } from './events.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @Get()
  list(@Query() query: QueryEventDto) {
    return this.events.list(query);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.events.findBySlug(slug);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/rsvp')
  rsvp(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body('status') status: RsvpStatus) {
    return this.events.rsvp(id, user.id, status);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.remove(id, user.id, user.role);
  }
}
