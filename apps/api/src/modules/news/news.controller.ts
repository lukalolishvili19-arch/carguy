import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CreateArticleDto, NewsService, QueryArticleDto } from './news.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Public()
  @Get('categories')
  categories() {
    return this.news.categories();
  }

  @Public()
  @Get('highlights')
  highlights() {
    return this.news.highlights();
  }

  @Public()
  @Get()
  list(@Query() query: QueryArticleDto) {
    return this.news.list(query);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.news.findBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Post()
  create(@Body() dto: CreateArticleDto) {
    return this.news.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.news.remove(id);
  }
}
