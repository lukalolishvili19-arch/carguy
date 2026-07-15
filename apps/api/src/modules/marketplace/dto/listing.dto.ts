import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  BodyType,
  DriveType,
  FuelType,
  ListingCategory,
  ListingCondition,
  Transmission,
} from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateListingDto {
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsEnum(ListingCategory) category!: ListingCategory;
  @IsOptional() @IsEnum(ListingCondition) condition?: ListingCondition;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() negotiable?: boolean;

  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsInt() mileage?: number;
  @IsOptional() @IsEnum(Transmission) transmission?: Transmission;
  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsEnum(DriveType) driveType?: DriveType;
  @IsOptional() @IsEnum(BodyType) bodyType?: BodyType;
  @IsOptional() @IsNumber() engineSize?: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() partNumber?: string;
  @IsOptional() @IsNumber() rimWidth?: number;
  @IsOptional() @IsNumber() rimHeight?: number;
  @IsOptional() @IsInt() rimRadius?: number;

  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class UpdateListingDto extends CreateListingDto {
  @IsOptional() declare title: string;
  @IsOptional() declare description: string;
  @IsOptional() declare category: ListingCategory;
  @IsOptional() declare price: number;
}

export class QueryListingDto extends PaginationDto {
  @IsOptional() @IsEnum(ListingCategory) category?: ListingCategory;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsEnum(ListingCondition) condition?: ListingCondition;
  @IsOptional() @IsEnum(Transmission) transmission?: Transmission;
  @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) minPrice?: number;
  @IsOptional() @Type(() => Number) maxPrice?: number;
  @IsOptional() @Type(() => Number) minYear?: number;
  @IsOptional() @Type(() => Number) maxYear?: number;
  @IsOptional() @Type(() => Number) maxMileage?: number;
  @IsOptional() @IsString() sort?: 'newest' | 'price_asc' | 'price_desc' | 'year_desc';
}
