import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaceType, Prisma } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.service';

export class NearbyQueryDto {
  @Type(() => Number) @IsNumber() lat!: number;
  @Type(() => Number) @IsNumber() lng!: number;
  @IsOptional() @Type(() => Number) @IsNumber() radiusKm?: number;
  @IsOptional() @IsEnum(PlaceType) type?: PlaceType;
  @IsOptional() @IsString() sort?: 'distance' | 'rating';
}

export class CreatePlaceDto {
  @IsString() name!: string;
  @IsEnum(PlaceType) type!: PlaceType;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsNumber() latitude!: number;
  @IsNumber() longitude!: number;
  @IsOptional() @IsString() phone?: string;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  config_() {
    return { mapboxToken: this.config.get<string>('mapbox.accessToken') };
  }

  async nearby(query: NearbyQueryDto) {
    const radius = query.radiusKm ?? 25;
    // Rough bounding box to reduce the candidate set before precise distance calc.
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos((query.lat * Math.PI) / 180) || 1);

    const where: Prisma.PlaceWhereInput = {
      latitude: { gte: query.lat - latDelta, lte: query.lat + latDelta },
      longitude: { gte: query.lng - lngDelta, lte: query.lng + lngDelta },
      ...(query.type ? { type: query.type } : {}),
    };

    const places = await this.prisma.place.findMany({
      where,
      include: {
        business: { select: { slug: true, ratingAvg: true, ratingCount: true, logoUrl: true } },
      },
      take: 200,
    });

    const withDistance = places
      .map((p) => ({
        ...p,
        distanceKm: Number(haversineKm(query.lat, query.lng, p.latitude, p.longitude).toFixed(2)),
      }))
      .filter((p) => p.distanceKm <= radius);

    withDistance.sort((a, b) =>
      query.sort === 'rating' ? b.ratingAvg - a.ratingAvg : a.distanceKm - b.distanceKm,
    );

    return withDistance;
  }

  async create(dto: CreatePlaceDto) {
    return this.prisma.place.create({ data: dto });
  }

  /** Mirror a business location into the map places table. */
  async syncBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business?.latitude || !business.longitude) return null;

    const typeMap: Record<string, PlaceType> = {
      DEALERSHIP: PlaceType.DEALERSHIP,
      CAR_WASH: PlaceType.CAR_WASH,
      DETAILING: PlaceType.DETAILING,
    };

    return this.prisma.place.upsert({
      where: { businessId },
      update: {
        name: business.name,
        latitude: business.latitude,
        longitude: business.longitude,
        city: business.city,
        ratingAvg: business.ratingAvg,
      },
      create: {
        businessId,
        name: business.name,
        type: typeMap[business.category] ?? PlaceType.MECHANIC,
        latitude: business.latitude,
        longitude: business.longitude,
        city: business.city,
        country: business.country,
        phone: business.phone,
        ratingAvg: business.ratingAvg,
      },
    });
  }
}
