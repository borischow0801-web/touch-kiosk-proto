import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { RolesService } from '../../system/roles.service';

@Controller('admin/system/permissions')
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('system:permission:read')
  list() {
    return this.rolesService.listPermissions();
  }
}
