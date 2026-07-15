import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { BookingStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateBookingDto {
  @IsString() businessId!: string;
  @IsOptional() @IsString() serviceId?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsString() scheduledAt!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() estimatedPrice?: number;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus) status!: BookingStatus;
  @IsOptional() @IsNumber() finalPrice?: number;
  @IsOptional() @IsString() scheduledAt?: string;
}

export class QueryBookingDto extends PaginationDto {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
}
