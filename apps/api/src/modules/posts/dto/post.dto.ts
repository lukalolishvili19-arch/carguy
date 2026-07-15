import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PostType, PostVisibility, MediaType, ReactionType } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

class PostMediaInput {
  @IsString() url!: string;
  @IsOptional() @IsEnum(MediaType) type?: MediaType;
  @IsOptional() @IsString() thumbnail?: string;
  @IsOptional() @IsInt() width?: number;
  @IsOptional() @IsInt() height?: number;
}

class PollInput {
  @IsString() question!: string;
  @IsArray() @IsString({ each: true }) options!: string[];
  @IsOptional() @IsString() expiresAt?: string;
}

export class CreatePostDto {
  @IsOptional() @IsEnum(PostType) type?: PostType;
  @IsOptional() @IsEnum(PostVisibility) visibility?: PostVisibility;
  @IsOptional() @IsString() @MaxLength(5000) content?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() latitude?: number;
  @IsOptional() longitude?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PostMediaInput)
  media?: PostMediaInput[];

  @IsOptional() @IsArray() @IsString({ each: true }) hashtags?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) mentions?: string[];

  @IsOptional() @ValidateNested() @Type(() => PollInput) poll?: PollInput;
}

export class UpdatePostDto {
  @IsOptional() @IsString() @MaxLength(5000) content?: string;
  @IsOptional() @IsEnum(PostVisibility) visibility?: PostVisibility;
}

export class ReactDto {
  @IsOptional() @IsEnum(ReactionType) type?: ReactionType;
}

export class FeedQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(PostType) type?: PostType;
  @IsOptional() @IsString() hashtag?: string;
  @IsOptional() @IsString() authorUsername?: string;
}
