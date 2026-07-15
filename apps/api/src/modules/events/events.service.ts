import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventType, Prisma, Role, RsvpStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';
import { uniqueSlug } from '../../common/utils/slug.util';

export class CreateEventDto {
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(EventType) type!: EventType;
  @IsOptional() @IsString() coverUrl?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsString() startsAt!: string;
  @IsOptional() @IsString() endsAt?: string;
  @IsOptional() @IsNumber() ticketPrice?: number;
  @IsOptional() @IsString() ticketUrl?: string;
  @IsOptional() @IsInt() capacity?: number;
}

export class QueryEventDto extends PaginationDto {
  @IsOptional() @IsEnum(EventType) type?: EventType;
  @IsOptional() @IsString() city?: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(hostId: string, dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...dto,
        hostId,
        slug: uniqueSlug(dto.title),
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async list(query: QueryEventDto) {
    const where: Prisma.EventWhereInput = {
      startsAt: { gte: new Date() },
      ...(query.type ? { type: query.type } : {}),
      ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { startsAt: 'asc' },
        include: {
          host: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          _count: { select: { rsvps: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        host: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        rsvps: {
          take: 24,
          where: { status: 'GOING' },
          include: { user: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
        },
        _count: { select: { rsvps: { where: { status: 'GOING' } } } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async rsvp(eventId: string, userId: string, status: RsvpStatus) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    await this.prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status },
      create: { eventId, userId, status },
    });
    return { message: 'RSVP saved', status };
  }

  async remove(id: string, userId: string, role: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== userId && role !== Role.ADMIN) throw new ForbiddenException('Not allowed');
    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted' };
  }
}
