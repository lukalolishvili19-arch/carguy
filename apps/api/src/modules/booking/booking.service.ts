import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto, QueryBookingDto, UpdateBookingStatusDto } from './dto/booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateBookingDto) {
    const business = await this.prisma.business.findUnique({ where: { id: dto.businessId } });
    if (!business) throw new NotFoundException('Business not found');

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        businessId: dto.businessId,
        serviceId: dto.serviceId,
        vehicleId: dto.vehicleId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
        estimatedPrice: dto.estimatedPrice,
      },
      include: { service: true, business: { select: { name: true, slug: true } } },
    });

    await this.notifications.create({
      userId: business.ownerId,
      type: 'BOOKING',
      title: 'New booking request',
      body: `for ${booking.scheduledAt.toLocaleString()}`,
      actorId: userId,
      entityType: 'BOOKING',
      entityId: booking.id,
    });

    return booking;
  }

  async myBookings(userId: string, query: QueryBookingDto) {
    const where: Prisma.BookingWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          service: true,
          vehicle: { select: { brand: true, model: true, year: true } },
          business: { select: { name: true, slug: true, logoUrl: true, phone: true } },
          review: { select: { id: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async businessBookings(ownerId: string, role: string, query: QueryBookingDto) {
    const business = await this.prisma.business.findUnique({ where: { ownerId } });
    if (!business && role !== Role.ADMIN) throw new NotFoundException('No business found');

    const where: Prisma.BookingWhereInput = {
      ...(business ? { businessId: business.id } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          service: true,
          vehicle: { select: { brand: true, model: true, year: true, licensePlate: true } },
          user: { select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true, phone: true } } } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async updateStatus(bookingId: string, userId: string, role: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { business: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const isOwner = booking.business.ownerId === userId;
    const isCustomer = booking.userId === userId;
    const canManage = isOwner || role === Role.ADMIN;

    // Customers may only cancel their own booking.
    if (!canManage && !(isCustomer && dto.status === 'CANCELLED')) {
      throw new ForbiddenException('Not allowed to change this booking');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: dto.status,
        finalPrice: dto.finalPrice,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });

    const notifyUserId = isOwner ? booking.userId : booking.business.ownerId;
    await this.notifications.create({
      userId: notifyUserId,
      type: 'BOOKING',
      title: `Booking ${dto.status.toLowerCase()}`,
      actorId: userId,
      entityType: 'BOOKING',
      entityId: bookingId,
    });

    return updated;
  }
}
