import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SysUser } from '../database/entities/sys-user.entity';
import { SysRole } from '../database/entities/sys-role.entity';
import { SysUserRole } from '../database/entities/sys-user-role.entity';
import { SysPermission } from '../database/entities/sys-permission.entity';
import { SysRolePermission } from '../database/entities/sys-role-permission.entity';
import { UsersService } from './users.service';
import { RolesService } from './roles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SysUser,
      SysRole,
      SysUserRole,
      SysPermission,
      SysRolePermission,
    ]),
  ],
  providers: [UsersService, RolesService],
  exports: [UsersService, RolesService],
})
export class SystemModule {}
