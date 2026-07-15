import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateReviewDto {
  @IsString() businessId!: string;
  @IsOptional() @IsString() bookingId?: string;
  @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) quality?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) price?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) professionalism?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) speed?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) communication?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) cleanliness?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) trustworthiness?: number;
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

export class QueryReviewDto extends PaginationDto {
  @IsOptional() @IsString() sort?: 'newest' | 'highest' | 'lowest';
}
