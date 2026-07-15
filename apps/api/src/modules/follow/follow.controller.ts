import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('follow')
@Controller()
export class FollowController {
  constructor(private readonly follow: FollowService) {}

  @ApiBearerAuth()
  @Post('users/:username/follow')
  followUser(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.follow.follow(user.id, username);
  }

  @ApiBearerAuth()
  @Delete('users/:username/follow')
  unfollowUser(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.follow.unfollow(user.id, username);
  }

  @Public()
  @Get('users/:username/followers')
  followers(@Param('username') username: string, @Query() query: PaginationDto) {
    return this.follow.followers(username, query);
  }

  @Public()
  @Get('users/:username/following')
  following(@Param('username') username: string, @Query() query: PaginationDto) {
    return this.follow.following(username, query);
  }
}
