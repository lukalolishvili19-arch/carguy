import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto, QueryReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async recomputeRating(businessId: string) {
    const agg = await this.prisma.review.aggregate({
      where: { businessId },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.business.update({
      where: { id: businessId },
      data: {
        ratingAvg: Number((agg._avg.rating ?? 0).toFixed(2)),
        ratingCount: agg._count,
      },
    });
  }

  async create(authorId: string, dto: CreateReviewDto) {
    const business = await this.prisma.business.findUnique({ where: { id: dto.businessId } });
    if (!business) throw new NotFoundException('Business not found');

    let isVerified = false;
    if (dto.bookingId) {
      const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } });
      if (!booking || booking.userId !== authorId || booking.businessId !== dto.businessId) {
        throw new BadRequestException('Invalid booking reference');
      }
      isVerified = booking.status === 'COMPLETED';
    }

    const { images, ...rest } = dto;
    const review = await this.prisma.review.create({
      data: {
        ...rest,
        authorId,
        isVerified,
        media: images?.length ? { create: images.map((url) => ({ url })) } : undefined,
      },
      include: { media: true },
    });

    await this.recomputeRating(dto.businessId);

    await this.notifications.create({
      userId: business.ownerId,
      type: 'REVIEW',
      title: `New ${dto.rating}-star review`,
      actorId: authorId,
      entityType: 'BUSINESS',
      entityId: business.id,
    });

    return review;
  }

  async listForBusiness(businessId: string, query: QueryReviewDto) {
    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      query.sort === 'highest'
        ? { rating: 'desc' }
        : query.sort === 'lowest'
          ? { rating: 'asc' }
          : { createdAt: 'desc' };

    const where = { businessId };
    const [items, total, breakdown] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy,
        include: {
          media: true,
          author: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({ by: ['rating'], where, _count: true, orderBy: { rating: 'asc' } }),
    ]);

    return {
      ...paginate(items, total, query.page, query.limit),
      breakdown: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: breakdown.find((b) => b.rating === star)?._count ?? 0,
      })),
    };
  }

  async topRatedBusinesses(limit = 10) {
    return this.prisma.business.findMany({
      where: { ratingCount: { gt: 0 }, isActive: true },
      orderBy: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        category: true,
        city: true,
        ratingAvg: true,
        ratingCount: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review || review.authorId !== userId) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    await this.recomputeRating(review.businessId);
    return { message: 'Review deleted' };
  }
}
