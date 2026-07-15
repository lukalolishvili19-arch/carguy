import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

const publicUserSelect = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
  profile: {
    select: {
      displayName: true,
      bio: true,
      avatarUrl: true,
      coverUrl: true,
      city: true,
      country: true,
      favoriteBrands: true,
    },
  },
  reputation: { select: { xp: true, level: true, isVerifiedMechanic: true } },
  _count: { select: { followers: true, following: true, posts: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string, viewerId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');

    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      const rel = await this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
      });
      isFollowing = !!rel;
    }

    return { ...user, isFollowing, isMe: viewerId === user.id };
  }

  async list(query: PaginationDto) {
    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { username: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async setRole(userId: string, role: Role) {
    await this.prisma.user.update({ where: { id: userId }, data: { role } });
    return { message: 'Role updated' };
  }

  async setBanned(userId: string, isBanned: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { isBanned } });
    return { message: isBanned ? 'User banned' : 'User unbanned' };
  }
}
