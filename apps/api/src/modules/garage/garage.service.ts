import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateVehicleDto,
  MaintenanceDto,
  MileageLogDto,
  ReminderDto,
  UpdateVehicleDto,
} from './dto/vehicle.dto';

@Injectable()
export class GarageService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertOwner(vehicleId: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.ownerId !== userId) throw new ForbiddenException('Not your vehicle');
    return vehicle;
  }

  async list(userId: string) {
    return this.prisma.vehicle.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        media: { orderBy: { order: 'asc' } },
        _count: { select: { maintenance: true, modifications: true, reminders: true } },
      },
    });
  }

  async findOne(vehicleId: string, userId: string) {
    await this.assertOwner(vehicleId, userId);
    return this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        media: { orderBy: { order: 'asc' } },
        modifications: { orderBy: { createdAt: 'desc' } },
        maintenance: { orderBy: { performedAt: 'desc' } },
        mileageLogs: { orderBy: { recordedAt: 'desc' } },
        reminders: { orderBy: { dueDate: 'asc' } },
        insurance: { include: { plan: { include: { company: true } } } },
      },
    });
  }

  async create(userId: string, dto: CreateVehicleDto) {
    const { images, purchaseDate, ...rest } = dto;
    return this.prisma.vehicle.create({
      data: {
        ...rest,
        ownerId: userId,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        media: images?.length ? { create: images.map((url, i) => ({ url, order: i })) } : undefined,
      },
      include: { media: true },
    });
  }

  async update(vehicleId: string, userId: string, dto: UpdateVehicleDto) {
    await this.assertOwner(vehicleId, userId);
    const { images, purchaseDate, ...rest } = dto;
    if (images) await this.prisma.vehicleMedia.deleteMany({ where: { vehicleId } });
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...rest,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        media: images?.length ? { create: images.map((url, i) => ({ url, order: i })) } : undefined,
      },
      include: { media: true },
    });
  }

  async remove(vehicleId: string, userId: string) {
    await this.assertOwner(vehicleId, userId);
    await this.prisma.vehicle.delete({ where: { id: vehicleId } });
    return { message: 'Vehicle removed' };
  }

  // ---------- Maintenance ----------
  async addMaintenance(vehicleId: string, userId: string, dto: MaintenanceDto) {
    await this.assertOwner(vehicleId, userId);
    return this.prisma.maintenanceRecord.create({
      data: { ...dto, vehicleId, performedAt: new Date(dto.performedAt) },
    });
  }

  async addMileageLog(vehicleId: string, userId: string, dto: MileageLogDto) {
    await this.assertOwner(vehicleId, userId);
    const [log] = await this.prisma.$transaction([
      this.prisma.mileageLog.create({ data: { ...dto, vehicleId } }),
      this.prisma.vehicle.update({ where: { id: vehicleId }, data: { mileage: dto.mileage } }),
    ]);
    return log;
  }

  async addReminder(vehicleId: string, userId: string, dto: ReminderDto) {
    await this.assertOwner(vehicleId, userId);
    return this.prisma.maintenanceReminder.create({
      data: {
        vehicleId,
        type: dto.type,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        dueMileage: dto.dueMileage,
      },
    });
  }

  async completeReminder(reminderId: string, userId: string) {
    const reminder = await this.prisma.maintenanceReminder.findUnique({ where: { id: reminderId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    await this.assertOwner(reminder.vehicleId, userId);
    return this.prisma.maintenanceReminder.update({
      where: { id: reminderId },
      data: { isDone: true },
    });
  }
}
