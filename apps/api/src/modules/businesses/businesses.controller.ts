import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto, QueryBusinessDto, UpdateBusinessDto } from './dto/business.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('businesses')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Public()
  @Get()
  list(@Query() query: QueryBusinessDto) {
    return this.businesses.list(query);
  }

  @ApiBearerAuth()
  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.businesses.getMine(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Get('me/dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.businesses.dashboard(user.id);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.businesses.findBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBusinessDto) {
    return this.businesses.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Put(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businesses.update(id, user.id, user.role, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.businesses.remove(id, user.id, user.role);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id/verify')
  verify(@Param('id') id: string, @Body('status') status: 'VERIFIED' | 'REJECTED' | 'PENDING') {
    return this.businesses.setVerification(id, status);
  }
}
