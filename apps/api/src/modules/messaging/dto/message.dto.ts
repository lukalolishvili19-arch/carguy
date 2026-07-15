import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateConversationDto {
  @IsArray()
  @IsString({ each: true })
  memberIds!: string[];

  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() businessId?: string;
}

export class SendMessageDto {
  @IsOptional() @IsEnum(MessageType) type?: MessageType;
  @IsOptional() @IsString() @MaxLength(4000) content?: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() durationSec?: number;
}

export class DirectMessageDto extends SendMessageDto {
  @IsString() @MinLength(1) recipientId!: string;
}
