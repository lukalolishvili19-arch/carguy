import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CreatePlaceDto, MapService, NearbyQueryDto } from './map.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('map')
@Controller('map')
export class MapController {
  constructor(private readonly map: MapService) {}

  @Public()
  @Get('config')
  config() {
    return this.map.config_();
  }

  @Public()
  @Get('nearby')
  nearby(@Query() query: NearbyQueryDto) {
    return this.map.nearby(query);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post('places')
  create(@Body() dto: CreatePlaceDto) {
    return this.map.create(dto);
  }
}
