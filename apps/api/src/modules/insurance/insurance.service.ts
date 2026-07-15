import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClaimStatus, PolicyStatus, Role } from '@prisma/client';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export class QuoteDto {
  @IsString() planId!: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() startDate?: string;
}

export class ClaimDto {
  @IsString() policyId!: string;
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @IsString() @MinLength(10) description!: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsString() incidentAt?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) documents?: string[];
}

@Injectable()
export class InsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  companies() {
    return this.prisma.insuranceCompany.findMany({
      where: { isActive: true },
      orderBy: { ratingAvg: 'desc' },
      include: { plans: { where: { isActive: true }, include: { coverages: true } } },
    });
  }

  async comparePlans(planIds: string[]) {
    return this.prisma.insurancePlan.findMany({
      where: { id: { in: planIds } },
      include: { company: true, coverages: true },
    });
  }

  async listPlans() {
    return this.prisma.insurancePlan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
      include: { company: true, coverages: true },
    });
  }

  async quote(userId: string, dto: QuoteDto) {
    const plan = await this.prisma.insurancePlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const start = dto.startDate ? new Date(dto.startDate) : new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    const renewalReminder = new Date(end);
    renewalReminder.setDate(renewalReminder.getDate() - 14);

    return this.prisma.insurancePolicy.create({
      data: {
        userId,
        planId: dto.planId,
        vehicleId: dto.vehicleId,
        status: PolicyStatus.QUOTED,
        premium: plan.yearlyPrice ?? plan.monthlyPrice.mul(12),
        startDate: start,
        endDate: end,
        renewalReminderAt: renewalReminder,
      },
      include: { plan: { include: { company: true } } },
    });
  }

  async activatePolicy(policyId: string, userId: string) {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: policyId } });
    if (!policy || policy.userId !== userId) throw new NotFoundException('Policy not found');
    return this.prisma.insurancePolicy.update({
      where: { id: policyId },
      data: {
        status: PolicyStatus.ACTIVE,
        policyNumber: `CG-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }

  myPolicies(userId: string) {
    return this.prisma.insurancePolicy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: { include: { company: true, coverages: true } },
        vehicle: { select: { brand: true, model: true, year: true } },
        _count: { select: { claims: true } },
      },
    });
  }

  async fileClaim(userId: string, dto: ClaimDto) {
    const policy = await this.prisma.insurancePolicy.findUnique({ where: { id: dto.policyId } });
    if (!policy || policy.userId !== userId) throw new NotFoundException('Policy not found');

    return this.prisma.insuranceClaim.create({
      data: {
        policyId: dto.policyId,
        userId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        incidentAt: dto.incidentAt ? new Date(dto.incidentAt) : undefined,
        documents: dto.documents?.length
          ? { create: dto.documents.map((url) => ({ url })) }
          : undefined,
      },
      include: { documents: true },
    });
  }

  myClaims(userId: string) {
    return this.prisma.insuranceClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { documents: true, policy: { include: { plan: { include: { company: true } } } } },
    });
  }

  async updateClaimStatus(claimId: string, status: ClaimStatus, role: string) {
    if (role !== Role.ADMIN && role !== Role.MODERATOR) {
      throw new ForbiddenException('Not allowed');
    }
    const claim = await this.prisma.insuranceClaim.update({
      where: { id: claimId },
      data: { status },
    });
    await this.notifications.create({
      userId: claim.userId,
      type: 'SYSTEM',
      title: `Claim ${status.toLowerCase().replace('_', ' ')}`,
      entityType: 'CLAIM',
      entityId: claimId,
    });
    return claim;
  }
}
