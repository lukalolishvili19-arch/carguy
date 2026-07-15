import { Injectable } from '@nestjs/common';
import { ReputationReason } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/** XP thresholds grow quadratically: level N needs 100 * (N-1)^2 XP. */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}
export function xpForLevel(level: number): number {
  return 100 * (level - 1) ** 2;
}

@Injectable()
export class ReputationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async award(userId: string, reason: ReputationReason, amount: number, meta?: string) {
    const rep = await this.prisma.reputation.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const newXp = Math.max(0, rep.xp + amount);
    const newLevel = levelFromXp(newXp);
    const leveledUp = newLevel > rep.level;

    await this.prisma.$transaction([
      this.prisma.reputation.update({
        where: { userId },
        data: { xp: newXp, level: newLevel },
      }),
      this.prisma.reputationLog.create({
        data: { userId, reason, amount, meta },
      }),
    ]);

    if (leveledUp) {
      await this.notifications.create({
        userId,
        type: 'ACHIEVEMENT',
        title: `Level up! You reached level ${newLevel}`,
      });
    }

    return { xp: newXp, level: newLevel, leveledUp };
  }

  async getMine(userId: string) {
    const rep = await this.prisma.reputation.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const nextLevelXp = xpForLevel(rep.level + 1);
    const currentLevelXp = xpForLevel(rep.level);
    return {
      ...rep,
      progress: {
        current: rep.xp - currentLevelXp,
        needed: nextLevelXp - currentLevelXp,
        nextLevelXp,
      },
    };
  }

  async grantBadge(userId: string, badgeKey: string) {
    const badge = await this.prisma.badge.findUnique({ where: { key: badgeKey } });
    if (!badge) return null;
    const userBadge = await this.prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id },
    });
    return userBadge;
  }

  async myBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async myAchievements(userId: string) {
    const all = await this.prisma.achievement.findMany();
    const unlocked = await this.prisma.userAchievement.findMany({ where: { userId } });
    return all.map((a) => {
      const ua = unlocked.find((u) => u.achievementId === a.id);
      return { ...a, progress: ua?.progress ?? 0, unlockedAt: ua?.unlockedAt ?? null };
    });
  }

  async leaderboard(limit = 20) {
    return this.prisma.reputation.findMany({
      orderBy: { xp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            profile: { select: { displayName: true, avatarUrl: true } },
            _count: { select: { forumThreads: true, forumPosts: true } },
          },
        },
      },
    });
  }

  async setVerified(userId: string, kind: 'mechanic' | 'business', value: boolean) {
    await this.prisma.reputation.upsert({
      where: { userId },
      update:
        kind === 'mechanic' ? { isVerifiedMechanic: value } : { isVerifiedBusiness: value },
      create: {
        userId,
        ...(kind === 'mechanic'
          ? { isVerifiedMechanic: value }
          : { isVerifiedBusiness: value }),
      },
    });
    await this.grantBadge(userId, kind === 'mechanic' ? 'mechanic' : 'business');
    return { message: 'Verification updated' };
  }
}
