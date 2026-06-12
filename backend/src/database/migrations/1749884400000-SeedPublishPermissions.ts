import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';

// Fixed UUIDs — publish permissions prefix 00000004.

export const SEED_PUBLISH_PERMISSIONS = [
  {
    id: '00000004-0000-0000-0000-000000000001',
    permissionCode: 'publish:record:read',
    permissionName: '发布记录查看',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 24,
  },
  {
    id: '00000004-0000-0000-0000-000000000002',
    permissionCode: 'publish:submit',
    permissionName: '提交审核',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 25,
  },
  {
    id: '00000004-0000-0000-0000-000000000003',
    permissionCode: 'publish:approve',
    permissionName: '审核通过',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 26,
  },
  {
    id: '00000004-0000-0000-0000-000000000004',
    permissionCode: 'publish:reject',
    permissionName: '审核驳回',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 27,
  },
  {
    id: '00000004-0000-0000-0000-000000000005',
    permissionCode: 'publish:direct-publish',
    permissionName: '直接发布',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 28,
  },
  {
    id: '00000004-0000-0000-0000-000000000006',
    permissionCode: 'publish:withdraw',
    permissionName: '撤回发布',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 29,
  },
  {
    id: '00000004-0000-0000-0000-000000000007',
    permissionCode: 'publish:rollback',
    permissionName: '版本回滚',
    moduleCode: 'publish',
    permissionType: 'api',
    sortOrder: 30,
  },
] as const;

export class SeedPublishPermissions1749884400000 implements MigrationInterface {
  name = 'SeedPublishPermissions1749884400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    for (const perm of SEED_PUBLISH_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (byId) {
        throw new Error(
          `SeedPublishPermissions up(): fixed permission id ${perm.id} already exists. Refusing to proceed.`,
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
    const permIds = SEED_PUBLISH_PERMISSIONS.map((p) => p.id);

    const rolePermRefs = await queryRunner.manager.count(SysRolePermission, {
      where: { permissionId: In(permIds) },
    });
    if (rolePermRefs > 0) {
      throw new Error(
        `SeedPublishPermissions down(): ${rolePermRefs} role-permission association(s) reference seed publish permissions. ` +
          'Refusing rollback to protect business data.',
      );
    }

    for (const perm of SEED_PUBLISH_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existing) {
        continue;
      }
      if (existing.permissionCode !== perm.permissionCode) {
        throw new Error(
          `SeedPublishPermissions down(): fixed permission id ${perm.id} has unexpected permissionCode. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysPermission, perm.id);
    }
  }
}
