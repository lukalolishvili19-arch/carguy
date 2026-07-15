import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { BanUserDto, UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Get()
  list(@Query() query: PaginationDto) {
    return this.users.list(query);
  }

  @Public()
  @Get(':username')
  findByUsername(@Param('username') username: string, @CurrentUser() user?: AuthUser) {
    return this.users.findByUsername(username, user?.id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/role')
  setRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.users.setRole(id, dto.role);
  }

  @Roles(Role.ADMIN, Role.MODERATOR)
  @Patch(':id/ban')
  setBanned(@Param('id') id: string, @Body() dto: BanUserDto) {
    return this.users.setBanned(id, dto.isBanned);
  }
}
