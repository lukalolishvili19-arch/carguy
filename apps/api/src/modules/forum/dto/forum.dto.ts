import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateThreadDto {
  @IsString() categorySlug!: string;
  @IsString() @MinLength(5) @MaxLength(180) title!: string;
  @IsString() @MinLength(10) @MaxLength(10000) content!: string;
}

export class CreateForumPostDto {
  @IsString() @MinLength(1) @MaxLength(10000) content!: string;
  @IsOptional() @IsString() parentId?: string;
}

export class VoteDto {
  @IsInt() @IsIn([1, -1]) value!: number;
}

export class QueryThreadDto extends PaginationDto {
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() sort?: 'newest' | 'top' | 'active';
}
