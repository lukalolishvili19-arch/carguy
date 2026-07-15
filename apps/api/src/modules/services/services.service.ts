import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceCategory, Role } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class ServiceDto {
  @IsString() @MaxLength(120) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(ServiceCategory) category!: ServiceCategory;
  @IsOptional() @IsNumber() priceFrom?: number;
  @IsOptional() @IsNumber() priceTo?: number;
  @IsOptional() @IsInt() durationMin?: number;
}

export class WorkingHourDto {
  @IsInt() dayOfWeek!: number;
  @IsOptional() @IsString() openTime?: string;
  @IsOptional() @IsString() closeTime?: string;
  @IsOptional() isClosed?: boolean;
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownerBusiness(userId: string) {
    const business = await this.prisma.business.findUnique({ where: { ownerId: userId } });
    if (!business) throw new NotFoundException('You do not have a business');
    return business;
  }

  async addService(userId: string, dto: ServiceDto) {
    const business = await this.ownerBusiness(userId);
    return this.prisma.service.create({ data: { ...dto, businessId: business.id } });
  }

  async updateService(id: string, userId: string, role: string, dto: Partial<ServiceDto>) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { business: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.business.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Not allowed');
    }
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async removeService(id: string, userId: string, role: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { business: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.business.ownerId !== userId && role !== Role.ADMIN) {
      throw new ForbiddenException('Not allowed');
    }
    await this.prisma.service.update({ where: { id }, data: { isActive: false } });
    return { message: 'Service removed' };
  }

  async setWorkingHours(userId: string, hours: WorkingHourDto[]) {
    const business = await this.ownerBusiness(userId);
    await this.prisma.workingHour.deleteMany({ where: { businessId: business.id } });
    if (hours.length) {
      await this.prisma.workingHour.createMany({
        data: hours.map((h) => ({ ...h, businessId: business.id })),
      });
    }
    return this.prisma.workingHour.findMany({
      where: { businessId: business.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
