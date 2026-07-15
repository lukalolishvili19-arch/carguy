import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConversationDto, SendMessageDto } from './dto/message.dto';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const memberIds = Array.from(new Set([userId, ...dto.memberIds]));

    if (memberIds.length === 2 && !dto.businessId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          AND: memberIds.map((id) => ({ members: { some: { userId: id } } })),
        },
        include: { members: true },
      });
      if (existing) return existing;
    }

    return this.prisma.conversation.create({
      data: {
        type: dto.businessId
          ? ConversationType.BUSINESS
          : memberIds.length > 2
            ? ConversationType.GROUP
            : ConversationType.DIRECT,
        title: dto.title,
        businessId: dto.businessId,
        members: { create: memberIds.map((id) => ({ userId: id })) },
      },
      include: { members: true },
    });
  }

  async getOrCreateDirect(userId: string, recipientId: string) {
    return this.createConversation(userId, { memberIds: [recipientId] });
  }

  private async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new ForbiddenException('You are not part of this conversation');
    return member;
  }

  async listConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          },
        },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    return conversations;
  }

  async getMessages(conversationId: string, userId: string, query: PaginationDto) {
    await this.assertMember(conversationId, userId);
    const where = { conversationId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.message.count({ where }),
    ]);
    return paginate(items.reverse(), total, query.page, query.limit);
  }

  async sendMessage(conversationId: string, senderId: string, dto: SendMessageDto) {
    await this.assertMember(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: dto.type ?? 'TEXT',
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        fileName: dto.fileName,
        durationSec: dto.durationSec,
      },
      include: {
        sender: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const recipients = await this.prisma.conversationMember.findMany({
      where: { conversationId, userId: { not: senderId } },
      select: { userId: true },
    });
    for (const r of recipients) {
      await this.notifications.create({
        userId: r.userId,
        type: 'MESSAGE',
        title: 'New message',
        body: dto.content?.slice(0, 80),
        actorId: senderId,
        entityType: 'CONVERSATION',
        entityId: conversationId,
      });
    }

    return message;
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { message: 'Marked as read' };
  }

  async assertMembership(conversationId: string, userId: string) {
    return this.assertMember(conversationId, userId);
  }
}
