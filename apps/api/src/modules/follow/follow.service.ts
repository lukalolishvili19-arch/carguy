import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async follow(followerId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw new NotFoundException('User not found');
    if (target.id === followerId) throw new BadRequestException('You cannot follow yourself');

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId: target.id } },
      update: {},
      create: { followerId, followingId: target.id },
    });

    await this.notifications.create({
      userId: target.id,
      type: 'FOLLOW',
      title: 'New follower',
      actorId: followerId,
      entityType: 'USER',
      entityId: followerId,
    });

    return { message: 'Followed', following: true };
  }

  async unfollow(followerId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.follow.deleteMany({
      where: { followerId, followingId: target.id },
    });
    return { message: 'Unfollowed', following: false };
  }

  private async listRelation(
    where: { followerId?: string; followingId?: string },
    relation: 'follower' | 'following',
    query: PaginationDto,
  ) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.follow.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          [relation]: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true, bio: true } },
            },
          },
        } as any,
      }),
      this.prisma.follow.count({ where }),
    ]);
    return paginate(
      items.map((i: any) => i[relation]),
      total,
      query.page,
      query.limit,
    );
  }

  async followers(username: string, query: PaginationDto) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    return this.listRelation({ followingId: user.id }, 'follower', query);
  }

  async following(username: string, query: PaginationDto) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException('User not found');
    return this.listRelation({ followerId: user.id }, 'following', query);
  }

  async isFollowing(followerId: string, targetId: string) {
    const rel = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    });
    return { following: !!rel };
  }
}
