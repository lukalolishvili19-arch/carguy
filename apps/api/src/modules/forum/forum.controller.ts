import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import {
  CreateForumPostDto,
  CreateThreadDto,
  QueryThreadDto,
  VoteDto,
} from './dto/forum.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('forum')
@Controller('forum')
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  @Public()
  @Get('categories')
  categories() {
    return this.forum.categories();
  }

  @Public()
  @Get('threads')
  listThreads(@Query() query: QueryThreadDto) {
    return this.forum.listThreads(query);
  }

  @Public()
  @Get('threads/:slug')
  getThread(@Param('slug') slug: string) {
    return this.forum.getThread(slug);
  }

  @ApiBearerAuth()
  @Post('threads')
  createThread(@CurrentUser() user: AuthUser, @Body() dto: CreateThreadDto) {
    return this.forum.createThread(user.id, dto);
  }

  @ApiBearerAuth()
  @Post('threads/:id/replies')
  reply(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateForumPostDto) {
    return this.forum.reply(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Post('threads/:id/vote')
  voteThread(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VoteDto) {
    return this.forum.voteThread(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Post('posts/:id/vote')
  votePost(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: VoteDto) {
    return this.forum.votePost(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Patch('posts/:id/accept')
  accept(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.forum.acceptAnswer(id, user.id, user.role);
  }
}
