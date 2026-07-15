import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportStatus, ReportTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, PaginationDto } from '../../common/dto/pagination.dto';

export class CreateReportDto {
  @IsEnum(ReportTargetType) targetType!: ReportTargetType;
  @IsString() targetId!: string;
  @IsString() reason!: string;
  @IsOptional() @IsString() details?: string;
}

export class ResolveReportDto {
  @IsEnum(ReportStatus) status!: ReportStatus;
  @IsOptional() @IsString() resolutionNote?: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [
      users,
      businesses,
      posts,
      listings,
      bookings,
      reviews,
      openReports,
      newUsers7d,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.post.count(),
      this.prisma.listing.count({ where: { status: 'ACTIVE' } }),
      this.prisma.booking.count(),
      this.prisma.review.count(),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
      }),
    ]);

    const usersByRole = await this.prisma.user.groupBy({ by: ['role'], _count: true });

    return {
      totals: { users, businesses, posts, listings, bookings, reviews, openReports },
      newUsers7d,
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count })),
    };
  }

  // ---------- Reports / moderation ----------
  createReport(reporterId: string, dto: CreateReportDto) {
    return this.prisma.report.create({ data: { ...dto, reporterId } });
  }

  async listReports(query: PaginationDto & { status?: ReportStatus }) {
    const where: Prisma.ReportWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true } },
          resolver: { select: { id: true, username: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async resolveReport(id: string, resolverId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    return this.prisma.report.update({
      where: { id },
      data: { status: dto.status, resolutionNote: dto.resolutionNote, resolverId },
    });
  }
}
