import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { uniqueSlug } from '../../common/utils/slug.util';
import { ReputationService } from '../reputation/reputation.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateForumPostDto,
  CreateThreadDto,
  QueryThreadDto,
  VoteDto,
} from './dto/forum.dto';

const authorSelect = {
  id: true,
  username: true,
  role: true,
  profile: { select: { displayName: true, avatarUrl: true } },
  reputation: { select: { level: true, xp: true, isVerifiedMechanic: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
    private readonly notifications: NotificationsService,
  ) {}

  categories() {
    return this.prisma.forumCategory.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { threads: true } } },
    });
  }

  async createThread(authorId: string, dto: CreateThreadDto) {
    const category = await this.prisma.forumCategory.findUnique({
      where: { slug: dto.categorySlug },
    });
    if (!category) throw new NotFoundException('Category not found');

    const thread = await this.prisma.forumThread.create({
      data: {
        categoryId: category.id,
        authorId,
        title: dto.title,
        slug: uniqueSlug(dto.title),
        content: dto.content,
      },
      include: { author: { select: authorSelect }, category: true },
    });

    await this.reputation.award(authorId, 'THREAD_CREATED', 5, thread.id);
    return thread;
  }

  async listThreads(query: QueryThreadDto) {
    const orderBy: Prisma.ForumThreadOrderByWithRelationInput =
      query.sort === 'top'
        ? { voteScore: 'desc' }
        : query.sort === 'active'
          ? { updatedAt: 'desc' }
          : { createdAt: 'desc' };

    const where: Prisma.ForumThreadWhereInput = {
      ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.forumThread.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [{ isPinned: 'desc' }, orderBy],
        include: {
          author: { select: authorSelect },
          category: { select: { name: true, slug: true, icon: true } },
          _count: { select: { posts: true } },
        },
      }),
      this.prisma.forumThread.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async getThread(slug: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { slug },
      include: {
        author: { select: authorSelect },
        category: { select: { name: true, slug: true, icon: true } },
        posts: {
          where: { parentId: null },
          orderBy: [{ isAccepted: 'desc' }, { voteScore: 'desc' }, { createdAt: 'asc' }],
          include: {
            author: { select: authorSelect },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: { author: { select: authorSelect } },
            },
          },
        },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    await this.prisma.forumThread.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });
    return thread;
  }

  async reply(threadId: string, authorId: string, dto: CreateForumPostDto) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.status === 'CLOSED') throw new ForbiddenException('Thread is closed');

    const [post] = await this.prisma.$transaction([
      this.prisma.forumPost.create({
        data: { threadId, authorId, content: dto.content, parentId: dto.parentId },
        include: { author: { select: authorSelect } },
      }),
      this.prisma.forumThread.update({
        where: { id: threadId },
        data: { replyCount: { increment: 1 }, updatedAt: new Date() },
      }),
    ]);

    await this.reputation.award(authorId, 'COMMENT_UPVOTED', 2, post.id);

    if (thread.authorId !== authorId) {
      await this.notifications.create({
        userId: thread.authorId,
        type: 'COMMENT',
        title: 'New reply to your thread',
        actorId: authorId,
        entityType: 'FORUM_THREAD',
        entityId: threadId,
      });
    }
    return post;
  }

  async voteThread(threadId: string, userId: string, dto: VoteDto) {
    return this.vote({ threadId }, userId, dto.value, 'forumThread', threadId);
  }

  async votePost(postId: string, userId: string, dto: VoteDto) {
    return this.vote({ postId }, userId, dto.value, 'forumPost', postId);
  }

  private async vote(
    target: { threadId?: string; postId?: string },
    userId: string,
    value: number,
    model: 'forumThread' | 'forumPost',
    id: string,
  ) {
    const where = target.threadId
      ? { userId_threadId: { userId, threadId: target.threadId } }
      : { userId_postId: { userId, postId: target.postId! } };

    const existing = await this.prisma.forumVote.findUnique({ where: where as any });

    let delta = value;
    if (existing) {
      if (existing.value === value) {
        // toggle off
        await this.prisma.forumVote.delete({ where: { id: existing.id } });
        delta = -value;
      } else {
        await this.prisma.forumVote.update({ where: { id: existing.id }, data: { value } });
        delta = value * 2;
      }
    } else {
      await this.prisma.forumVote.create({ data: { ...target, userId, value } });
    }

    const updated = await (this.prisma[model] as any).update({
      where: { id },
      data: { voteScore: { increment: delta } },
      select: { voteScore: true, authorId: true },
    });

    if (delta > 0 && updated.authorId !== userId) {
      await this.reputation.award(
        updated.authorId,
        model === 'forumThread' ? 'POST_UPVOTED' : 'COMMENT_UPVOTED',
        1,
        id,
      );
    }
    return { voteScore: updated.voteScore };
  }

  async acceptAnswer(postId: string, userId: string, role: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      include: { thread: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.thread.authorId !== userId && role !== Role.ADMIN && role !== Role.MODERATOR) {
      throw new ForbiddenException('Only the thread author can accept an answer');
    }

    await this.prisma.forumPost.updateMany({
      where: { threadId: post.threadId },
      data: { isAccepted: false },
    });
    await this.prisma.forumPost.update({ where: { id: postId }, data: { isAccepted: true } });
    await this.reputation.award(post.authorId, 'BEST_ANSWER', 15, postId);
    await this.reputation.grantBadge(post.authorId, 'helper');

    await this.prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: post.authorId,
          achievementId: (await this.prisma.achievement.findUnique({ where: { key: 'helper' } }))!.id,
        },
      },
      update: { unlockedAt: new Date(), progress: 1 },
      create: {
        userId: post.authorId,
        achievementId: (await this.prisma.achievement.findUnique({ where: { key: 'helper' } }))!.id,
        unlockedAt: new Date(),
        progress: 1,
      },
    }).catch(() => undefined);

    return { message: 'Answer accepted' };
  }
}
