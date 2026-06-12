import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { RolesService } from '../../system/roles.service';
import { CreateRoleDto } from '../../system/dto/create-role.dto';
import { UpdateRoleDto } from '../../system/dto/update-role.dto';
import { AssignPermissionsDto } from '../../system/dto/assign-permissions.dto';

@Controller('admin/system/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('system:role:read')
  list() {
    return this.rolesService.list();
  }

  @Post()
  @RequirePermissions('system:role:create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  @RequirePermissions('system:role:update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions('system:role:delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Put(':id/permissions')
  @RequirePermissions('system:role:assign-permissions')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto) {
    return this.rolesService.assignPermissions(id, dto);
  }
}
