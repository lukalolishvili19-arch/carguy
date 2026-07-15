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
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto, QueryListingDto, UpdateListingDto } from './dto/listing.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Public()
  @Get()
  list(@Query() query: QueryListingDto, @CurrentUser() user?: AuthUser) {
    return this.marketplace.list(query, user?.id);
  }

  @ApiBearerAuth()
  @Get('mine')
  mine(@CurrentUser() user: AuthUser, @Query() query: QueryListingDto) {
    return this.marketplace.mine(user.id, query);
  }

  @ApiBearerAuth()
  @Get('favorites')
  favorites(@CurrentUser() user: AuthUser, @Query() query: QueryListingDto) {
    return this.marketplace.myFavorites(user.id, query);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.marketplace.findBySlug(slug, user?.id);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.marketplace.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.marketplace.update(id, user.id, user.role, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'REMOVED',
  ) {
    return this.marketplace.setStatus(id, user.id, user.role, status);
  }

  @ApiBearerAuth()
  @Post(':id/favorite')
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplace.toggleFavorite(id, user.id);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplace.remove(id, user.id, user.role);
  }
}
