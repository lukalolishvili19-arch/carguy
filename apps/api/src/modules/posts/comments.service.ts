import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/comment.dto';

const authorSelect = {
  id: true,
  username: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(postId: string, authorId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const content = dto.content?.trim() ?? '';

    const [comment] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: { postId, authorId, content, imageUrl: dto.imageUrl, parentId: dto.parentId },
        include: { author: { select: authorSelect } },
      }),
      this.prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ]);

    await this.notifications.create({
      userId: post.authorId,
      type: 'COMMENT',
      title: 'New comment on your post',
      body: content ? content.slice(0, 80) : '📷 Photo',
      actorId: authorId,
      entityType: 'POST',
      entityId: postId,
    });

    return comment;
  }

  async list(postId: string, query: PaginationDto) {
    const where: Prisma.CommentWhereInput = { postId, parentId: null };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: authorSelect },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: authorSelect } },
          },
          _count: { select: { reactions: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async remove(id: string, userId: string, role: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId && role !== Role.ADMIN && role !== Role.MODERATOR) {
      throw new ForbiddenException('Not allowed');
    }
    await this.prisma.$transaction([
      this.prisma.comment.delete({ where: { id } }),
      this.prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);
    return { message: 'Comment deleted' };
  }

  async like(id: string, userId: string) {
    const existing = await this.prisma.reaction.findUnique({
      where: { userId_commentId: { userId, commentId: id } },
    });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.reaction.delete({ where: { id: existing.id } }),
        this.prisma.comment.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }
    await this.prisma.$transaction([
      this.prisma.reaction.create({ data: { userId, commentId: id } }),
      this.prisma.comment.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }
}
