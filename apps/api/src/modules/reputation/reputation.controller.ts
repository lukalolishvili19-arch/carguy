import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReputationService } from './reputation.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reputation')
@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Public()
  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    return this.reputation.leaderboard(limit ? parseInt(limit, 10) : 20);
  }

  @ApiBearerAuth()
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.reputation.getMine(user.id);
  }

  @ApiBearerAuth()
  @Get('me/badges')
  badges(@CurrentUser() user: AuthUser) {
    return this.reputation.myBadges(user.id);
  }

  @ApiBearerAuth()
  @Get('me/achievements')
  achievements(@CurrentUser() user: AuthUser) {
    return this.reputation.myAchievements(user.id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':userId/verify/:kind')
  verify(
    @Param('userId') userId: string,
    @Param('kind') kind: 'mechanic' | 'business',
    @Body('value') value: boolean,
  ) {
    return this.reputation.setVerified(userId, kind, value);
  }
}
