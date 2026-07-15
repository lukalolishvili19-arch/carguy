import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsOptional() @IsString() @MaxLength(2000) content?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() parentId?: string;
}
