import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';

// Fixed UUIDs — guide item permissions prefix 00000007.

export const SEED_GUIDE_ITEM_PERMISSIONS = [
  {
    id: '00000007-0000-0000-0000-000000000001',
    permissionCode: 'guide:item:read',
    permissionName: '事项配置查看',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 39,
  },
  {
    id: '00000007-0000-0000-0000-000000000002',
    permissionCode: 'guide:item:create',
    permissionName: '事项配置创建',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 40,
  },
  {
    id: '00000007-0000-0000-0000-000000000003',
    permissionCode: 'guide:item:update',
    permissionName: '事项配置编辑',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 41,
  },
  {
    id: '00000007-0000-0000-0000-000000000004',
    permissionCode: 'guide:item:delete',
    permissionName: '事项配置删除',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 42,
  },
] as const;

type SeedGuideItemPermission = (typeof SEED_GUIDE_ITEM_PERMISSIONS)[number];

export function guideItemPermissionMatchesSeed(
  existing: Pick<
    SysPermission,
    'permissionCode' | 'permissionName' | 'moduleCode' | 'permissionType' | 'sortOrder'
  >,
  perm: SeedGuideItemPermission,
): boolean {
  return (
    existing.permissionCode === perm.permissionCode &&
    existing.permissionName === perm.permissionName &&
    existing.moduleCode === perm.moduleCode &&
    existing.permissionType === perm.permissionType &&
    existing.sortOrder === perm.sortOrder
  );
}

export class SeedGuideItemPermissions1749914400000 implements MigrationInterface {
  name = 'SeedGuideItemPermissions1749914400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    for (const perm of SEED_GUIDE_ITEM_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (byId) {
        if (!guideItemPermissionMatchesSeed(byId, perm)) {
          throw new Error(
            `SeedGuideItemPermissions up(): fixed permission id ${perm.id} exists with unexpected ownership fields. Refusing to proceed.`,
          );
        }
        continue;
      }

      const byCode = await queryRunner.manager.findOne(SysPermission, {
        where: { permissionCode: perm.permissionCode },
      });
      if (byCode) {
        throw new Error(
          `SeedGuideItemPermissions up(): permissionCode ${perm.permissionCode} already exists with id ${byCode.id}. Refusing to proceed.`,
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
    const permIds = SEED_GUIDE_ITEM_PERMISSIONS.map((p) => p.id);

    const rolePermRefs = await queryRunner.manager.count(SysRolePermission, {
      where: { permissionId: In(permIds) },
    });
    if (rolePermRefs > 0) {
      throw new Error(
        `SeedGuideItemPermissions down(): ${rolePermRefs} role-permission association(s) reference seed guide item permissions. ` +
          'Refusing rollback to protect business data.',
      );
    }

    for (const perm of SEED_GUIDE_ITEM_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existing) {
        continue;
      }
      if (!guideItemPermissionMatchesSeed(existing, perm)) {
        throw new Error(
          `SeedGuideItemPermissions down(): fixed permission id ${perm.id} has unexpected ownership fields. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysPermission, perm.id);
    }
  }
}
