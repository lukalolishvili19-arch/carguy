import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  createSession(callerId: string, calleeId: string, video: boolean) {
    return this.prisma.callSession.create({
      data: {
        callerId,
        calleeId,
        video,
        status: 'RINGING',
      },
    });
  }

  async accept(sessionId: string, userId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Call not found');
    if (session.calleeId !== userId) throw new ForbiddenException();
    return this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  async reject(sessionId: string, userId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Call not found');
    if (session.calleeId !== userId && session.callerId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status: 'REJECTED', endedAt: new Date() },
    });
  }

  async hangup(sessionId: string, userId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Call not found');
    if (session.calleeId !== userId && session.callerId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }
}
