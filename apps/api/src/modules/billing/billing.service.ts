import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Role, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const BUSINESS_MONTHLY_PRICE = 10;
export const BUSINESS_CURRENCY = 'GEL';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlan() {
    return {
      name: 'Business',
      amount: BUSINESS_MONTHLY_PRICE,
      currency: BUSINESS_CURRENCY,
      interval: 'month',
      description: 'Business ანგარიში — კომპანიის განთავსება სერვისებში',
    };
  }

  async getMySubscription(userId: string) {
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { userId },
      include: { payments: { orderBy: { paidAt: 'desc' }, take: 5 } },
    });
    return {
      plan: await this.getPlan(),
      subscription: sub,
      isActive: this.isActive(sub),
    };
  }

  private isActive(sub: { status: SubscriptionStatus; currentPeriodEnd: Date | null } | null) {
    if (!sub) return false;
    if (sub.status !== SubscriptionStatus.ACTIVE) return false;
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
    return true;
  }

  /** Start or resume a pending business subscription (before payment). */
  async startCheckout(userId: string) {
    const existing = await this.prisma.businessSubscription.findUnique({ where: { userId } });
    if (existing && this.isActive(existing)) {
      return { subscription: existing, alreadyActive: true };
    }

    const subscription = await this.prisma.businessSubscription.upsert({
      where: { userId },
      update: {
        status: SubscriptionStatus.PENDING,
        amount: BUSINESS_MONTHLY_PRICE,
        currency: BUSINESS_CURRENCY,
        interval: 'month',
      },
      create: {
        userId,
        status: SubscriptionStatus.PENDING,
        amount: BUSINESS_MONTHLY_PRICE,
        currency: BUSINESS_CURRENCY,
        interval: 'month',
      },
    });

    return {
      subscription,
      alreadyActive: false,
      plan: await this.getPlan(),
    };
  }

  /**
   * Dev/manual payment confirmation.
   * When a real gateway (BOG / TBC / Stripe) is wired, replace this with webhook handling.
   */
  async confirmPayment(userId: string, note?: string) {
    const sub = await this.prisma.businessSubscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('გამოწერა ვერ მოიძებნა — ჯერ დაიწყე checkout');

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [subscription] = await this.prisma.$transaction([
      this.prisma.businessSubscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          lastPaidAt: now,
        },
      }),
      this.prisma.businessPayment.create({
        data: {
          subscriptionId: sub.id,
          amount: BUSINESS_MONTHLY_PRICE,
          currency: BUSINESS_CURRENCY,
          status: 'PAID',
          provider: 'manual',
          note: note ?? 'Business monthly subscription',
          paidAt: now,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.BUSINESS },
      }),
    ]);

    return {
      message: 'გადახდა წარმატებულია — Business ანგარიში გააქტიურდა',
      subscription,
      plan: await this.getPlan(),
    };
  }

  async cancel(userId: string) {
    const sub = await this.prisma.businessSubscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('გამოწერა ვერ მოიძებნა');
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('აქტიური გამოწერა არ გაქვს');
    }

    await this.prisma.businessSubscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED },
    });

    // Keep BUSINESS role until period end; cron will demote when expired.
    return { message: 'გამოწერა გაუქმდა — აქტიური დარჩება ვადის ამოწურვამდე' };
  }

  /** Demote expired business accounts every hour. */
  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions() {
    const now = new Date();
    const expired = await this.prisma.businessSubscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED] },
        currentPeriodEnd: { lt: now },
      },
    });

    for (const sub of expired) {
      await this.prisma.$transaction([
        this.prisma.businessSubscription.update({
          where: { id: sub.id },
          data: { status: SubscriptionStatus.EXPIRED },
        }),
        this.prisma.user.updateMany({
          where: { id: sub.userId, role: Role.BUSINESS },
          data: { role: Role.USER },
        }),
      ]);
    }
  }
}
