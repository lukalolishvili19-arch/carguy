import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FuelType, MaintenanceType, Transmission } from '@prisma/client';

export class CreateVehicleDto {
  @IsOptional() @IsString() @MaxLength(60) nickname?: string;
  @IsString() brand!: string;
  @IsString() model!: string;
  @IsInt() year!: number;
  @IsOptional() @IsString() trim?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() licensePlate?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsInt() mileage?: number;
  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsEnum(Transmission) transmission?: Transmission;
  @IsOptional() @IsString() purchaseDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class UpdateVehicleDto extends CreateVehicleDto {
  @IsOptional() declare brand: string;
  @IsOptional() declare model: string;
  @IsOptional() declare year: number;
}

export class MaintenanceDto {
  @IsEnum(MaintenanceType) type!: MaintenanceType;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() mileage?: number;
  @IsOptional() @IsNumber() cost?: number;
  @IsString() performedAt!: string;
  @IsOptional() @IsString() performedBy?: string;
}

export class MileageLogDto {
  @IsInt() mileage!: number;
  @IsOptional() @IsNumber() liters?: number;
  @IsOptional() @IsNumber() cost?: number;
}

export class ReminderDto {
  @IsEnum(MaintenanceType) type!: MaintenanceType;
  @IsString() title!: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsInt() dueMileage?: number;
}
