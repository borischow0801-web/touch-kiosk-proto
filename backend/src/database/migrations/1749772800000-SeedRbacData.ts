import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { SysRole } from '../entities/sys-role.entity';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';
import { SysUserRole } from '../entities/sys-user-role.entity';

// Fixed UUIDs ensure idempotent re-runs and safe migration:revert → migration:run cycles.
// Roles: prefix 00000001, Permissions: prefix 00000002.

export const SEED_ROLES = [
  {
    id: '00000001-0000-0000-0000-000000000001',
    roleCode: 'SUPER_ADMIN',
    roleName: '超级管理员',
    status: 'active',
  },
  {
    id: '00000001-0000-0000-0000-000000000002',
    roleCode: 'CONTENT_EDITOR',
    roleName: '内容编辑员',
    status: 'active',
  },
  {
    id: '00000001-0000-0000-0000-000000000003',
    roleCode: 'PUBLISH_REVIEWER',
    roleName: '审核发布员',
    status: 'active',
  },
] as const;

export const SEED_PERMISSIONS = [
  // User management (sortOrder 1–6)
  {
    id: '00000002-0000-0000-0000-000000000001',
    permissionCode: 'system:user:read',
    permissionName: '用户查看',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 1,
  },
  {
    id: '00000002-0000-0000-0000-000000000002',
    permissionCode: 'system:user:create',
    permissionName: '用户创建',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 2,
  },
  {
    id: '00000002-0000-0000-0000-000000000003',
    permissionCode: 'system:user:update',
    permissionName: '用户编辑',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 3,
  },
  {
    id: '00000002-0000-0000-0000-000000000004',
    permissionCode: 'system:user:delete',
    permissionName: '用户删除',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 4,
  },
  {
    id: '00000002-0000-0000-0000-000000000005',
    permissionCode: 'system:user:reset-password',
    permissionName: '用户密码重置',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 5,
  },
  {
    id: '00000002-0000-0000-0000-000000000006',
    permissionCode: 'system:user:assign-roles',
    permissionName: '用户角色分配',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 6,
  },
  // Role management (sortOrder 7–11)
  {
    id: '00000002-0000-0000-0000-000000000007',
    permissionCode: 'system:role:read',
    permissionName: '角色查看',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 7,
  },
  {
    id: '00000002-0000-0000-0000-000000000008',
    permissionCode: 'system:role:create',
    permissionName: '角色创建',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 8,
  },
  {
    id: '00000002-0000-0000-0000-000000000009',
    permissionCode: 'system:role:update',
    permissionName: '角色编辑',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 9,
  },
  {
    id: '00000002-0000-0000-0000-000000000010',
    permissionCode: 'system:role:delete',
    permissionName: '角色删除',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 10,
  },
  {
    id: '00000002-0000-0000-0000-000000000011',
    permissionCode: 'system:role:assign-permissions',
    permissionName: '角色权限分配',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 11,
  },
  // Permission management (sortOrder 12)
  {
    id: '00000002-0000-0000-0000-000000000012',
    permissionCode: 'system:permission:read',
    permissionName: '权限列表查看',
    moduleCode: 'system',
    permissionType: 'api',
    sortOrder: 12,
  },
] as const;

export class SeedRbacData1749772800000 implements MigrationInterface {
  name = 'SeedRbacData1749772800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    for (const role of SEED_ROLES) {
      const byId = await queryRunner.manager.findOne(SysRole, {
        where: { id: role.id },
        withDeleted: true,
      });
      if (byId) {
        throw new Error(
          `SeedRbacData up(): fixed role id ${role.id} already exists. Refusing to proceed.`,
        );
      }

      const byCode = await queryRunner.manager.findOne(SysRole, {
        where: { roleCode: role.roleCode },
        withDeleted: true,
      });
      if (byCode) {
        // Same business code with a different ID — skip insert to avoid unique-index conflict.
        continue;
      }

      await queryRunner.manager.insert(SysRole, {
        id: role.id,
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: null,
        status: role.status,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (const perm of SEED_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (byId) {
        throw new Error(
          `SeedRbacData up(): fixed permission id ${perm.id} already exists. Refusing to proceed.`,
        );
      }

      const byCode = await queryRunner.manager.findOne(SysPermission, {
        where: { permissionCode: perm.permissionCode },
      });
      if (byCode) {
        continue;
      }

      await queryRunner.manager.insert(SysPermission, {
        id: perm.id,
        permissionCode: perm.permissionCode,
        permissionName: perm.permissionName,
        moduleCode: perm.moduleCode,
        permissionType: perm.permissionType,
        sortOrder: perm.sortOrder,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const roleIds = SEED_ROLES.map((r) => r.id);
    const permIds = SEED_PERMISSIONS.map((p) => p.id);

    const userRoleRefs = await queryRunner.manager.count(SysUserRole, {
      where: { roleId: In(roleIds) },
    });
    if (userRoleRefs > 0) {
      throw new Error(
        `SeedRbacData down(): ${userRoleRefs} user-role association(s) reference seed roles. ` +
          'Refusing rollback to protect business data.',
      );
    }

    const rolePermRefs = await queryRunner.manager.count(SysRolePermission, {
      where: [{ roleId: In(roleIds) }, { permissionId: In(permIds) }],
    });
    if (rolePermRefs > 0) {
      throw new Error(
        `SeedRbacData down(): ${rolePermRefs} role-permission association(s) reference seed data. ` +
          'Refusing rollback to protect business data.',
      );
    }

    for (const perm of SEED_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existing) {
        continue;
      }
      if (existing.permissionCode !== perm.permissionCode) {
        throw new Error(
          `SeedRbacData down(): fixed permission id ${perm.id} has unexpected permissionCode. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysPermission, perm.id);
    }

    for (const role of SEED_ROLES) {
      const existing = await queryRunner.manager.findOne(SysRole, {
        where: { id: role.id },
        withDeleted: true,
      });
      if (!existing) {
        continue;
      }
      if (existing.roleCode !== role.roleCode) {
        throw new Error(
          `SeedRbacData down(): fixed role id ${role.id} has unexpected roleCode. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysRole, role.id);
    }
  }
}
