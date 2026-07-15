import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StoriesService } from './stories.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

class CreateStoryDto {
  @IsString() mediaUrl!: string;
  @IsOptional() @IsEnum(MediaType) type?: MediaType;
  @IsOptional() @IsString() caption?: string;
}

@ApiTags('stories')
@ApiBearerAuth()
@Controller('stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Public()
  @Get()
  feed(@CurrentUser() user?: AuthUser) {
    return this.stories.activeFeed(user?.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateStoryDto) {
    return this.stories.create(user.id, dto);
  }

  @Post(':id/view')
  view(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stories.view(id, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.stories.remove(id, user.id);
  }
}
