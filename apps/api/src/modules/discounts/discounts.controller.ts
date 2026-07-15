import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  CreateDiscountDto,
  DiscountsService,
  QueryDiscountDto,
} from './discounts.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Public()
  @Get()
  listActive(@Query() query: QueryDiscountDto) {
    return this.discounts.listActive(query);
  }

  @ApiBearerAuth()
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Get('mine')
  listMine(@CurrentUser() user: AuthUser) {
    return this.discounts.listMine(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.BUSINESS, Role.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDiscountDto) {
    return this.discounts.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/redeem')
  redeem(@Param('id') id: string) {
    return this.discounts.redeem(id);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.discounts.remove(id, user.id, user.role);
  }
}
