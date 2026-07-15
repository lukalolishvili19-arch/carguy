import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(60) displayName?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsUrl() avatarUrl?: string;
  @IsOptional() @IsUrl() coverUrl?: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) country?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsDateString() birthDate?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) favoriteBrands?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) favoriteCars?: string[];
  @IsOptional() @IsString() locale?: string;
}
