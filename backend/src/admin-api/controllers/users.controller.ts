import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../auth/dto/auth-response.dto';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { UsersService } from '../../system/users.service';
import { CreateUserDto } from '../../system/dto/create-user.dto';
import { UpdateUserDto } from '../../system/dto/update-user.dto';
import { ResetPasswordDto } from '../../system/dto/reset-password.dto';
import { UserListQueryDto } from '../../system/dto/user-list-query.dto';
import { AssignRolesDto } from '../../system/dto/assign-roles.dto';

@Controller('admin/system/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('system:user:read')
  list(@Query() query: UserListQueryDto) {
    return this.usersService.list(query);
  }

  @Get(':id')
  @RequirePermissions('system:user:read')
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Post()
  @RequirePermissions('system:user:create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:user:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const currentUser = req.user as AuthenticatedUser;
    return this.usersService.update(id, dto, currentUser.id);
  }

  @Put(':id/roles')
  @RequirePermissions('system:user:assign-roles')
  assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    const currentUser = req.user as AuthenticatedUser;
    return this.usersService.assignRoles(id, dto, currentUser.id);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('system:user:delete')
  remove(@Param('id') id: string, @Req() req: Request & { user?: AuthenticatedUser }) {
    const currentUser = req.user as AuthenticatedUser;
    return this.usersService.remove(id, currentUser.id);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermissions('system:user:reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }

  @Post(':id/disable')
  @HttpCode(200)
  @RequirePermissions('system:user:update')
  disable(@Param('id') id: string, @Req() req: Request & { user?: AuthenticatedUser }) {
    const currentUser = req.user as AuthenticatedUser;
    return this.usersService.disable(id, currentUser.id);
  }

  @Post(':id/enable')
  @HttpCode(200)
  @RequirePermissions('system:user:update')
  enable(@Param('id') id: string) {
    return this.usersService.enable(id);
  }
}
