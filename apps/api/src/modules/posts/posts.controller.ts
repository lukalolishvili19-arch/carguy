import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CommentsService } from './comments.service';
import { CreatePostDto, FeedQueryDto, ReactDto, UpdatePostDto } from './dto/post.dto';
import { CreateCommentDto } from './dto/comment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly comments: CommentsService,
  ) {}

  @Public()
  @Get()
  feed(@Query() query: FeedQueryDto, @CurrentUser() user?: AuthUser) {
    return this.posts.feed(query, user?.id);
  }

  @ApiBearerAuth()
  @Get('feed')
  personalized(@CurrentUser() user: AuthUser, @Query() query: FeedQueryDto) {
    return this.posts.personalizedFeed(user.id, query);
  }

  @ApiBearerAuth()
  @Get('bookmarks')
  bookmarks(@CurrentUser() user: AuthUser, @Query() query: FeedQueryDto) {
    return this.posts.myBookmarks(user.id, query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.posts.findOne(id, user?.id);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, user.id, user.role, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.remove(id, user.id, user.role);
  }

  @ApiBearerAuth()
  @Post(':id/like')
  react(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReactDto) {
    return this.posts.react(id, user.id, dto.type);
  }

  @ApiBearerAuth()
  @Post(':id/bookmark')
  bookmark(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.posts.toggleBookmark(id, user.id);
  }

  @ApiBearerAuth()
  @Post('poll/options/:optionId/vote')
  votePoll(@CurrentUser() user: AuthUser, @Param('optionId') optionId: string) {
    return this.posts.votePoll(optionId, user.id);
  }

  // ---------- Comments ----------
  @Public()
  @Get(':id/comments')
  listComments(@Param('id') id: string, @Query() query: PaginationDto) {
    return this.comments.list(id, query);
  }

  @ApiBearerAuth()
  @Post(':id/comments')
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Post('comments/:commentId/like')
  likeComment(@CurrentUser() user: AuthUser, @Param('commentId') commentId: string) {
    return this.comments.like(commentId, user.id);
  }

  @ApiBearerAuth()
  @Delete('comments/:commentId')
  removeComment(@CurrentUser() user: AuthUser, @Param('commentId') commentId: string) {
    return this.comments.remove(commentId, user.id, user.role);
  }
}
