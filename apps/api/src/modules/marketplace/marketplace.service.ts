import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { uniqueSlug } from '../../common/utils/slug.util';
import { CreateListingDto, QueryListingDto, UpdateListingDto } from './dto/listing.dto';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  private orderBy(sort?: string): Prisma.ListingOrderByWithRelationInput {
    switch (sort) {
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'year_desc':
        return { year: 'desc' };
      default:
        return { createdAt: 'desc' };
    }
  }

  async create(sellerId: string, dto: CreateListingDto) {
    const { images, description, ...rest } = dto;
    return this.prisma.listing.create({
      data: {
        ...rest,
        description: description?.trim() ?? '',
        sellerId,
        slug: uniqueSlug(dto.title),
        media: images?.length ? { create: images.map((url, i) => ({ url, order: i })) } : undefined,
      },
      include: { media: true },
    });
  }

  async list(query: QueryListingDto, userId?: string) {
    const where: Prisma.ListingWhereInput = {
      status: 'ACTIVE',
      ...(query.category ? { category: query.category } : {}),
      ...(query.brand ? { brand: { contains: query.brand, mode: 'insensitive' } } : {}),
      ...(query.model ? { model: { contains: query.model, mode: 'insensitive' } } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.transmission ? { transmission: query.transmission } : {}),
      ...(query.fuelType ? { fuelType: query.fuelType } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
      ...(query.minPrice || query.maxPrice
        ? { price: { gte: query.minPrice ?? undefined, lte: query.maxPrice ?? undefined } }
        : {}),
      ...(query.minYear || query.maxYear
        ? { year: { gte: query.minYear ?? undefined, lte: query.maxYear ?? undefined } }
        : {}),
      ...(query.maxMileage ? { mileage: { lte: query.maxMileage } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: this.orderBy(query.sort),
        include: {
          media: { take: 1, orderBy: { order: 'asc' } },
          seller: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          ...(userId ? { favorites: { where: { userId }, take: 1 } } : {}),
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    const decorated = items.map((l: any) => ({
      ...l,
      favoritedByMe: Array.isArray(l.favorites) ? l.favorites.length > 0 : false,
      favorites: undefined,
    }));

    return paginate(decorated, total, query.page, query.limit);
  }

  async findBySlug(slug: string, userId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { slug },
      include: {
        media: { orderBy: { order: 'asc' } },
        seller: {
          select: {
            id: true,
            username: true,
            createdAt: true,
            profile: { select: { displayName: true, avatarUrl: true, phone: true, city: true } },
          },
        },
        ...(userId ? { favorites: { where: { userId }, take: 1 } } : {}),
      },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    await this.prisma.listing.update({ where: { slug }, data: { viewCount: { increment: 1 } } });
    return {
      ...listing,
      favoritedByMe: Array.isArray((listing as any).favorites)
        ? (listing as any).favorites.length > 0
        : false,
    };
  }

  private async assertOwner(id: string, userId: string, role: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.sellerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Not allowed');
    }
    return listing;
  }

  async update(id: string, userId: string, role: string, dto: UpdateListingDto) {
    await this.assertOwner(id, userId, role);
    const { images, ...rest } = dto;
    if (images) {
      await this.prisma.listingMedia.deleteMany({ where: { listingId: id } });
    }
    return this.prisma.listing.update({
      where: { id },
      data: {
        ...rest,
        media: images?.length ? { create: images.map((url, i) => ({ url, order: i })) } : undefined,
      },
      include: { media: true },
    });
  }

  async setStatus(id: string, userId: string, role: string, status: 'ACTIVE' | 'SOLD' | 'EXPIRED' | 'REMOVED') {
    await this.assertOwner(id, userId, role);
    return this.prisma.listing.update({ where: { id }, data: { status } });
  }

  async remove(id: string, userId: string, role: string) {
    await this.assertOwner(id, userId, role);
    await this.prisma.listing.delete({ where: { id } });
    return { message: 'Listing removed' };
  }

  async toggleFavorite(listingId: string, userId: string) {
    const existing = await this.prisma.listingFavorite.findUnique({
      where: { listingId_userId: { listingId, userId } },
    });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.listingFavorite.delete({ where: { id: existing.id } }),
        this.prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { decrement: 1 } } }),
      ]);
      return { favorited: false };
    }
    await this.prisma.$transaction([
      this.prisma.listingFavorite.create({ data: { listingId, userId } }),
      this.prisma.listing.update({ where: { id: listingId }, data: { favoriteCount: { increment: 1 } } }),
    ]);
    return { favorited: true };
  }

  async myFavorites(userId: string, query: QueryListingDto) {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.listingFavorite.findMany({
        where: { userId },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { listing: { include: { media: { take: 1, orderBy: { order: 'asc' } } } } },
      }),
      this.prisma.listingFavorite.count({ where: { userId } }),
    ]);
    return paginate(rows.map((r) => r.listing), total, query.page, query.limit);
  }

  async mine(userId: string, query: QueryListingDto) {
    const where = { sellerId: userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { media: { take: 1, orderBy: { order: 'asc' } } },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }
}
