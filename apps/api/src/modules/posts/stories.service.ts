import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Permanently removes stories older than 24h. Runs every hour. */
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpired() {
    const { count } = await this.prisma.story.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (count > 0) this.logger.log(`Deleted ${count} expired stories`);
    return count;
  }

  async create(authorId: string, dto: { mediaUrl: string; type?: MediaType; caption?: string }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return this.prisma.story.create({
      data: {
        authorId,
        mediaUrl: dto.mediaUrl,
        type: dto.type ?? MediaType.IMAGE,
        caption: dto.caption,
        expiresAt,
      },
    });
  }

  /**
   * Active stories grouped by author.
   * Logged-in: followed users + self. Guest / empty circle: recent public stories.
   */
  async activeFeed(userId?: string) {
    let authorIds: string[] | undefined;
    if (userId) {
      const following = await this.prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      authorIds = [...following.map((f) => f.followingId), userId];
    }

    const stories = await this.prisma.story.findMany({
      where: {
        expiresAt: { gt: new Date() },
        ...(authorIds ? { authorId: { in: authorIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: authorIds ? undefined : 40,
      include: {
        author: {
          select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } },
        },
        ...(userId
          ? { views: { where: { viewerId: userId }, take: 1 } }
          : {}),
      },
    });

    // If following circle has no stories yet, fall back to discover so the rail isn't empty.
    if (userId && stories.length === 0) {
      return this.activeFeed(undefined);
    }

    const grouped = new Map<string, any>();
    for (const s of stories) {
      const key = s.authorId;
      if (!grouped.has(key)) {
        grouped.set(key, { author: s.author, stories: [] });
      }
      const views = Array.isArray((s as any).views) ? (s as any).views : [];
      grouped.get(key).stories.push({ ...s, views: undefined, seen: views.length > 0 });
    }
    return Array.from(grouped.values());
  }

  async view(storyId: string, viewerId: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    await this.prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId, viewerId } },
      update: {},
      create: { storyId, viewerId },
    });
    return { message: 'Viewed' };
  }

  async remove(storyId: string, userId: string) {
    await this.prisma.story.deleteMany({ where: { id: storyId, authorId: userId } });
    return { message: 'Story deleted' };
  }
}
