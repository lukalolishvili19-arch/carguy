import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType, Prisma, Role } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';

export class CreateDiscountDto {
  @IsEnum(DiscountType) type!: DiscountType;
  @IsString() @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsInt() percentOff?: number;
  @IsOptional() @IsNumber() amountOff?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() startsAt?: string;
  @IsOptional() @IsString() expiresAt?: string;
  @IsOptional() @IsInt() maxRedemptions?: number;
}

export class QueryDiscountDto extends PaginationDto {
  @IsOptional() @IsEnum(DiscountType) type?: DiscountType;
}

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownerBusiness(userId: string) {
    const business = await this.prisma.business.findUnique({ where: { ownerId: userId } });
    if (!business) throw new NotFoundException('You do not have a business');
    return business;
  }

  async create(userId: string, dto: CreateDiscountDto) {
    const business = await this.ownerBusiness(userId);
    return this.prisma.discount.create({
      data: {
        businessId: business.id,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        code: dto.code,
        percentOff: dto.percentOff,
        amountOff: dto.amountOff,
        imageUrl: dto.imageUrl,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        maxRedemptions: dto.maxRedemptions,
      },
    });
  }

  async listActive(query: QueryDiscountDto) {
    const now = new Date();
    const where: Prisma.DiscountWhereInput = {
      isActive: true,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(query.type ? { type: query.type } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.discount.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
        },
      }),
      this.prisma.discount.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async listMine(userId: string) {
    const business = await this.ownerBusiness(userId);
    return this.prisma.discount.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async redeem(id: string) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount || !discount.isActive) throw new NotFoundException('Discount unavailable');
    if (discount.maxRedemptions && discount.redeemedCount >= discount.maxRedemptions) {
      throw new ForbiddenException('Discount fully redeemed');
    }
    await this.prisma.discount.update({
      where: { id },
      data: { redeemedCount: { increment: 1 } },
    });
    return { message: 'Redeemed', code: discount.code };
  }

  async remove(id: string, userId: string, role: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { business: true },
    });
    if (!discount) throw new NotFoundException('Discount not found');
    if (discount.business.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Not allowed');
    }
    await this.prisma.discount.delete({ where: { id } });
    return { message: 'Discount deleted' };
  }
}
