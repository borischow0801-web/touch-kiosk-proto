import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';

// Fixed UUIDs — guide permissions prefix 00000005.

export const SEED_GUIDE_PERMISSIONS = [
  {
    id: '00000005-0000-0000-0000-000000000001',
    permissionCode: 'guide:dept:read',
    permissionName: '部门映射查看',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 31,
  },
  {
    id: '00000005-0000-0000-0000-000000000002',
    permissionCode: 'guide:dept:create',
    permissionName: '部门映射创建',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 32,
  },
  {
    id: '00000005-0000-0000-0000-000000000003',
    permissionCode: 'guide:dept:update',
    permissionName: '部门映射编辑',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 33,
  },
  {
    id: '00000005-0000-0000-0000-000000000004',
    permissionCode: 'guide:dept:delete',
    permissionName: '部门映射删除',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 34,
  },
  {
    id: '00000005-0000-0000-0000-000000000005',
    permissionCode: 'guide:theme:read',
    permissionName: '主题映射查看',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 35,
  },
  {
    id: '00000005-0000-0000-0000-000000000006',
    permissionCode: 'guide:theme:create',
    permissionName: '主题映射创建',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 36,
  },
  {
    id: '00000005-0000-0000-0000-000000000007',
    permissionCode: 'guide:theme:update',
    permissionName: '主题映射编辑',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 37,
  },
  {
    id: '00000005-0000-0000-0000-000000000008',
    permissionCode: 'guide:theme:delete',
    permissionName: '主题映射删除',
    moduleCode: 'guide',
    permissionType: 'api',
    sortOrder: 38,
  },
] as const;

type SeedGuidePermission = (typeof SEED_GUIDE_PERMISSIONS)[number];

export function guidePermissionMatchesSeed(
  existing: Pick<
    SysPermission,
    'permissionCode' | 'permissionName' | 'moduleCode' | 'permissionType' | 'sortOrder'
  >,
  perm: SeedGuidePermission,
): boolean {
  return (
    existing.permissionCode === perm.permissionCode &&
    existing.permissionName === perm.permissionName &&
    existing.moduleCode === perm.moduleCode &&
    existing.permissionType === perm.permissionType &&
    existing.sortOrder === perm.sortOrder
  );
}

export class SeedGuidePermissions1749898800000 implements MigrationInterface {
  name = 'SeedGuidePermissions1749898800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    for (const perm of SEED_GUIDE_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (byId) {
        if (!guidePermissionMatchesSeed(byId, perm)) {
          throw new Error(
            `SeedGuidePermissions up(): fixed permission id ${perm.id} exists with unexpected ownership fields. Refusing to proceed.`,
          );
        }
        continue;
      }

      const byCode = await queryRunner.manager.findOne(SysPermission, {
        where: { permissionCode: perm.permissionCode },
      });
      if (byCode) {
        throw new Error(
          `SeedGuidePermissions up(): permissionCode ${perm.permissionCode} already exists with id ${byCode.id}. Refusing to proceed.`,
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
    const permIds = SEED_GUIDE_PERMISSIONS.map((p) => p.id);

    const rolePermRefs = await queryRunner.manager.count(SysRolePermission, {
      where: { permissionId: In(permIds) },
    });
    if (rolePermRefs > 0) {
      throw new Error(
        `SeedGuidePermissions down(): ${rolePermRefs} role-permission association(s) reference seed guide permissions. ` +
          'Refusing rollback to protect business data.',
      );
    }

    for (const perm of SEED_GUIDE_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existing) {
        continue;
      }
      if (!guidePermissionMatchesSeed(existing, perm)) {
        throw new Error(
          `SeedGuidePermissions down(): fixed permission id ${perm.id} has unexpected ownership fields. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysPermission, perm.id);
    }
  }
}
