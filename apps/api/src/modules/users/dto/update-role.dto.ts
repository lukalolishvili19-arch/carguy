import { IsBoolean, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}

export class BanUserDto {
  @IsBoolean()
  isBanned!: boolean;
}
