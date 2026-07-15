import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePostDto, FeedQueryDto, UpdatePostDto } from './dto/post.dto';

const authorSelect = {
  id: true,
  username: true,
  role: true,
  profile: { select: { displayName: true, avatarUrl: true } },
  reputation: { select: { level: true, isVerifiedMechanic: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private postInclude(userId?: string) {
    return {
      author: { select: authorSelect },
      media: { orderBy: { order: 'asc' as const } },
      poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
      hashtags: { include: { hashtag: true } },
      _count: { select: { comments: true, reactions: true, bookmarks: true } },
      ...(userId
        ? {
            reactions: { where: { userId }, take: 1 },
            bookmarks: { where: { userId }, take: 1 },
          }
        : {}),
    } satisfies Prisma.PostInclude;
  }

  private async syncHashtags(tags: string[]) {
    const ids: string[] = [];
    for (const raw of tags) {
      const tag = raw.replace(/^#/, '').toLowerCase().trim();
      if (!tag) continue;
      const hashtag = await this.prisma.hashtag.upsert({
        where: { tag },
        update: { useCount: { increment: 1 } },
        create: { tag, useCount: 1 },
      });
      ids.push(hashtag.id);
    }
    return ids;
  }

  async create(authorId: string, dto: CreatePostDto) {
    const hashtagIds = dto.hashtags?.length ? await this.syncHashtags(dto.hashtags) : [];

    const post = await this.prisma.post.create({
      data: {
        authorId,
        type: dto.type ?? 'PHOTO',
        visibility: dto.visibility ?? 'PUBLIC',
        content: dto.content,
        location: dto.location,
        latitude: dto.latitude,
        longitude: dto.longitude,
        media: dto.media?.length
          ? { create: dto.media.map((m, i) => ({ ...m, order: i })) }
          : undefined,
        hashtags: hashtagIds.length
          ? { create: hashtagIds.map((hashtagId) => ({ hashtagId })) }
          : undefined,
        mentions: dto.mentions?.length
          ? { create: dto.mentions.map((mentionedUserId) => ({ mentionedUserId })) }
          : undefined,
        poll: dto.poll
          ? {
              create: {
                question: dto.poll.question,
                expiresAt: dto.poll.expiresAt ? new Date(dto.poll.expiresAt) : undefined,
                options: { create: dto.poll.options.map((text, i) => ({ text, order: i })) },
              },
            }
          : undefined,
      },
      include: this.postInclude(authorId),
    });

    if (dto.mentions?.length) {
      for (const uid of dto.mentions) {
        await this.notifications.create({
          userId: uid,
          type: 'MENTION',
          title: 'You were mentioned in a post',
          actorId: authorId,
          entityType: 'POST',
          entityId: post.id,
        });
      }
    }

    return post;
  }

  async feed(query: FeedQueryDto, userId?: string) {
    const where: Prisma.PostWhereInput = {
      visibility: 'PUBLIC',
      ...(query.type ? { type: query.type } : {}),
      ...(query.authorUsername ? { author: { username: query.authorUsername } } : {}),
      ...(query.hashtag
        ? { hashtags: { some: { hashtag: { tag: query.hashtag.toLowerCase() } } } }
        : {}),
      ...(query.search ? { content: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: this.postInclude(userId),
      }),
      this.prisma.post.count({ where }),
    ]);

    return paginate(items.map((p) => this.decorate(p)), total, query.page, query.limit);
  }

  /** Personalized feed: posts from people the user follows + their own. */
  async personalizedFeed(userId: string, query: FeedQueryDto) {
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const authorIds = [...following.map((f) => f.followingId), userId];

    const where: Prisma.PostWhereInput = {
      authorId: { in: authorIds },
      visibility: { in: ['PUBLIC', 'FOLLOWERS'] },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: this.postInclude(userId),
      }),
      this.prisma.post.count({ where }),
    ]);

    return paginate(items.map((p) => this.decorate(p)), total, query.page, query.limit);
  }

  private decorate(post: any) {
    const { reactions, bookmarks, ...rest } = post;
    return {
      ...rest,
      likedByMe: Array.isArray(reactions) ? reactions.length > 0 : false,
      bookmarkedByMe: Array.isArray(bookmarks) ? bookmarks.length > 0 : false,
    };
  }

  async findOne(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: this.postInclude(userId),
    });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return this.decorate(post);
  }

  async update(id: string, userId: string, role: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && role !== Role.ADMIN && role !== Role.MODERATOR) {
      throw new ForbiddenException('Not allowed');
    }
    return this.prisma.post.update({ where: { id }, data: dto, include: this.postInclude(userId) });
  }

  async remove(id: string, userId: string, role: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId && role !== Role.ADMIN && role !== Role.MODERATOR) {
      throw new ForbiddenException('Not allowed');
    }
    await this.prisma.post.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  // ---------- Reactions ----------
  async react(postId: string, userId: string, type: any = 'LIKE') {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.reaction.delete({ where: { id: existing.id } }),
        this.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }

    await this.prisma.$transaction([
      this.prisma.reaction.create({ data: { userId, postId, type } }),
      this.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);

    await this.notifications.create({
      userId: post.authorId,
      type: 'LIKE',
      title: 'Someone liked your post',
      actorId: userId,
      entityType: 'POST',
      entityId: postId,
    });

    return { liked: true };
  }

  // ---------- Bookmarks ----------
  async toggleBookmark(postId: string, userId: string) {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { userId, postId } });
    return { bookmarked: true };
  }

  async myBookmarks(userId: string, query: FeedQueryDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bookmark.findMany({
        where: { userId },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { post: { include: this.postInclude(userId) } },
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);
    return paginate(rows.map((r) => this.decorate(r.post)), total, query.page, query.limit);
  }

  // ---------- Poll ----------
  async votePoll(optionId: string, userId: string) {
    const option = await this.prisma.pollOption.findUnique({ where: { id: optionId }, include: { poll: true } });
    if (!option) throw new NotFoundException('Poll option not found');

    const siblings = await this.prisma.pollOption.findMany({ where: { pollId: option.pollId } });
    await this.prisma.pollVote.deleteMany({
      where: { userId, optionId: { in: siblings.map((s) => s.id) } },
    });
    await this.prisma.pollVote.create({ data: { optionId, userId } });
    return { message: 'Vote recorded' };
  }
}
