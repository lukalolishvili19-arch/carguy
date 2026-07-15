import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { uniqueSlug } from '../../common/utils/slug.util';
import { CreateBusinessDto, QueryBusinessDto, UpdateBusinessDto } from './dto/business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertActiveBusinessSubscription(ownerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      include: { businessSubscription: true },
    });
    if (!user) throw new ForbiddenException('Unauthorized');
    if (user.role === Role.ADMIN) return;

    const sub = user.businessSubscription;
    const active =
      sub?.status === SubscriptionStatus.ACTIVE &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

    if (!active) {
      throw new ForbiddenException(
        'Business გამოწერა აქტიური არ არის — გადაიხადე 10 ₾/თვე',
      );
    }
  }

  async create(ownerId: string, dto: CreateBusinessDto) {
    await this.assertActiveBusinessSubscription(ownerId);
    const existing = await this.prisma.business.findUnique({ where: { ownerId } });
    if (existing) throw new ForbiddenException('You already have a business profile');

    const {
      capabilities = [],
      supportedBrands = [],
      supportedModels = [],
      yearFrom,
      yearTo,
      ...rest
    } = dto;

    const business = await this.prisma.business.create({
      data: {
        ...rest,
        ownerId,
        slug: uniqueSlug(dto.name),
        country: dto.country ?? 'Georgia',
        supportedBrands,
        supportedModels,
        yearFrom,
        yearTo,
        capabilities,
        services: capabilities.length
          ? {
              create: capabilities.map((name) => ({
                name,
                category: dto.category,
                description: name,
              })),
            }
          : undefined,
      },
      include: { services: true },
    });
    return business;
  }

  async list(query: QueryBusinessDto) {
    const where: Prisma.BusinessWhereInput = {
      isActive: true,
      ...(query.category ? { category: query.category } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.minRating ? { ratingAvg: { gte: query.minRating } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.business.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [{ ratingAvg: 'desc' }, { createdAt: 'desc' }],
        include: { _count: { select: { reviews: true, services: true } } },
      }),
      this.prisma.business.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        services: { where: { isActive: true } },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        gallery: { orderBy: { order: 'asc' } },
        certificates: true,
        employees: true,
        socialLinks: true,
        discounts: { where: { isActive: true } },
        owner: { select: { id: true, username: true } },
        _count: { select: { reviews: true } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  private async assertOwner(businessId: string, userId: string, role: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Business not found');
    if (business.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('You do not own this business');
    }
    return business;
  }

  async update(businessId: string, userId: string, role: string, dto: UpdateBusinessDto) {
    await this.assertOwner(businessId, userId, role);
    return this.prisma.business.update({ where: { id: businessId }, data: dto });
  }

  async remove(businessId: string, userId: string, role: string) {
    await this.assertOwner(businessId, userId, role);
    await this.prisma.business.update({
      where: { id: businessId },
      data: { isActive: false },
    });
    return { message: 'Business deactivated' };
  }

  async setVerification(businessId: string, status: 'VERIFIED' | 'REJECTED' | 'PENDING') {
    await this.prisma.business.update({
      where: { id: businessId },
      data: { verification: status },
    });
    return { message: `Verification set to ${status}` };
  }

  async getMine(userId: string) {
    return this.prisma.business.findUnique({
      where: { ownerId: userId },
      include: { services: true, _count: { select: { bookings: true, reviews: true } } },
    });
  }

  async dashboard(userId: string) {
    const business = await this.prisma.business.findUnique({ where: { ownerId: userId } });
    if (!business) throw new NotFoundException('No business found');

    const since30d = new Date(Date.now() - 30 * 864e5);
    const [
      totalBookings,
      pendingBookings,
      completedBookings,
      reviews,
      activeDiscounts,
      recentBookings,
      bookingsByStatus,
      revenueAgg,
    ] = await this.prisma.$transaction([
      this.prisma.booking.count({ where: { businessId: business.id } }),
      this.prisma.booking.count({ where: { businessId: business.id, status: 'PENDING' } }),
      this.prisma.booking.count({ where: { businessId: business.id, status: 'COMPLETED' } }),
      this.prisma.review.count({ where: { businessId: business.id } }),
      this.prisma.discount.count({ where: { businessId: business.id, isActive: true } }),
      this.prisma.booking.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          service: { select: { name: true } },
        },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { businessId: business.id },
        _count: true,
        orderBy: { status: 'asc' },
      }),
      this.prisma.booking.aggregate({
        where: { businessId: business.id, status: 'COMPLETED', updatedAt: { gte: since30d } },
        _sum: { finalPrice: true },
      }),
    ]);

    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        ratingAvg: business.ratingAvg,
        ratingCount: business.ratingCount,
        verification: business.verification,
      },
      kpis: {
        totalBookings,
        pendingBookings,
        completedBookings,
        reviews,
        activeDiscounts,
        revenue30d: revenueAgg._sum.finalPrice ?? 0,
      },
      bookingsByStatus: bookingsByStatus.map((b) => ({ status: b.status, count: b._count })),
      recentBookings,
    };
  }
}
