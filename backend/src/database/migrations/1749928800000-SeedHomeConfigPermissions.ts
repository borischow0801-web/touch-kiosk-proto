import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';

// Fixed UUIDs — home permissions prefix 00000009.

export const SEED_HOME_CONFIG_PERMISSIONS = [
  {
    id: '00000009-0000-0000-0000-000000000001',
    permissionCode: 'home:config:read',
    permissionName: '首页配置查看',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 43,
  },
  {
    id: '00000009-0000-0000-0000-000000000002',
    permissionCode: 'home:config:update',
    permissionName: '首页配置编辑',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 44,
  },
  {
    id: '00000009-0000-0000-0000-000000000003',
    permissionCode: 'home:module:read',
    permissionName: '首页模块查看',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 45,
  },
  {
    id: '00000009-0000-0000-0000-000000000004',
    permissionCode: 'home:module:create',
    permissionName: '首页模块创建',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 46,
  },
  {
    id: '00000009-0000-0000-0000-000000000005',
    permissionCode: 'home:module:update',
    permissionName: '首页模块编辑',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 47,
  },
  {
    id: '00000009-0000-0000-0000-000000000006',
    permissionCode: 'home:module:delete',
    permissionName: '首页模块删除',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 48,
  },
  {
    id: '00000009-0000-0000-0000-000000000007',
    permissionCode: 'home:module:sort',
    permissionName: '首页模块排序',
    moduleCode: 'home',
    permissionType: 'api',
    sortOrder: 49,
  },
] as const;

type SeedHomeConfigPermission = (typeof SEED_HOME_CONFIG_PERMISSIONS)[number];

export function homeConfigPermissionMatchesSeed(
  existing: Pick<
    SysPermission,
    'permissionCode' | 'permissionName' | 'moduleCode' | 'permissionType' | 'sortOrder'
  >,
  perm: SeedHomeConfigPermission,
): boolean {
  return (
    existing.permissionCode === perm.permissionCode &&
    existing.permissionName === perm.permissionName &&
    existing.moduleCode === perm.moduleCode &&
    existing.permissionType === perm.permissionType &&
    existing.sortOrder === perm.sortOrder
  );
}

export class SeedHomeConfigPermissions1749928800000 implements MigrationInterface {
  name = 'SeedHomeConfigPermissions1749928800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    for (const perm of SEED_HOME_CONFIG_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (byId) {
        if (!homeConfigPermissionMatchesSeed(byId, perm)) {
          throw new Error(
            `SeedHomeConfigPermissions up(): fixed permission id ${perm.id} exists with unexpected ownership fields. Refusing to proceed.`,
          );
        }
        continue;
      }

      const byCode = await queryRunner.manager.findOne(SysPermission, {
        where: { permissionCode: perm.permissionCode },
      });
      if (byCode) {
        throw new Error(
          `SeedHomeConfigPermissions up(): permissionCode ${perm.permissionCode} already exists with id ${byCode.id}. Refusing to proceed.`,
        );
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
    const permIds = SEED_HOME_CONFIG_PERMISSIONS.map((p) => p.id);

    const rolePermRefs = await queryRunner.manager.count(SysRolePermission, {
      where: { permissionId: In(permIds) },
    });
    if (rolePermRefs > 0) {
      throw new Error(
        `SeedHomeConfigPermissions down(): ${rolePermRefs} role-permission association(s) reference seed home permissions. ` +
          'Refusing rollback to protect business data.',
      );
    }

    for (const perm of SEED_HOME_CONFIG_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existing) {
        continue;
      }
      if (!homeConfigPermissionMatchesSeed(existing, perm)) {
        throw new Error(
          `SeedHomeConfigPermissions down(): fixed permission id ${perm.id} has unexpected ownership fields. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysPermission, perm.id);
    }
  }
}
