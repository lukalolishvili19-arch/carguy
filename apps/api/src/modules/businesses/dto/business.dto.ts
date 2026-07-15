import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ServiceCategory } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateBusinessDto {
  @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @IsString() @MinLength(10) @MaxLength(2000) description!: string;
  @IsEnum(ServiceCategory) category!: ServiceCategory;
  @IsOptional() @IsUrl() logoUrl?: string;
  @IsOptional() @IsUrl() coverUrl?: string;
  @IsOptional() @IsString() email?: string;
  @IsString() @MinLength(5) @MaxLength(40) phone!: string;
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsString() @MinLength(2) city!: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) supportedBrands?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) supportedModels?: string[];
  @IsOptional() @Type(() => Number) @IsInt() yearFrom?: number;
  @IsOptional() @Type(() => Number) @IsInt() yearTo?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) capabilities?: string[];
}

export class UpdateBusinessDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(2000) description?: string;
  @IsOptional() @IsEnum(ServiceCategory) category?: ServiceCategory;
  @IsOptional() @IsUrl() logoUrl?: string;
  @IsOptional() @IsUrl() coverUrl?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(40) phone?: string;
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsString() addressLine?: string;
  @IsOptional() @IsString() @MinLength(2) city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) supportedBrands?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) supportedModels?: string[];
  @IsOptional() @Type(() => Number) @IsInt() yearFrom?: number;
  @IsOptional() @Type(() => Number) @IsInt() yearTo?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) capabilities?: string[];
}

export class QueryBusinessDto extends PaginationDto {
  @IsOptional() @IsEnum(ServiceCategory) category?: ServiceCategory;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @Type(() => Number) minRating?: number;
}
