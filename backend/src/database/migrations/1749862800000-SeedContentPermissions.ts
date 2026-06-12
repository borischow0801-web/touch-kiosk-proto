import { In, MigrationInterface, QueryRunner } from 'typeorm';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';

// Fixed UUIDs ensure idempotent re-runs and safe migration:revert → migration:run cycles.
// Content permissions: prefix 00000003.

export const SEED_CONTENT_PERMISSIONS = [
  {
    id: '00000003-0000-0000-0000-000000000001',
    permissionCode: 'content:category:read',
    permissionName: '分类查看',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 13,
  },
  {
    id: '00000003-0000-0000-0000-000000000002',
    permissionCode: 'content:category:create',
    permissionName: '分类创建',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 14,
  },
  {
    id: '00000003-0000-0000-0000-000000000003',
    permissionCode: 'content:category:update',
    permissionName: '分类编辑',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 15,
  },
  {
    id: '00000003-0000-0000-0000-000000000004',
    permissionCode: 'content:category:delete',
    permissionName: '分类删除',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 16,
  },
  {
    id: '00000003-0000-0000-0000-000000000005',
    permissionCode: 'content:item:read',
    permissionName: '内容查看',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 17,
  },
  {
    id: '00000003-0000-0000-0000-000000000006',
    permissionCode: 'content:item:create',
    permissionName: '内容创建',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 18,
  },
  {
    id: '00000003-0000-0000-0000-000000000007',
    permissionCode: 'content:item:update',
    permissionName: '内容编辑',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 19,
  },
  {
    id: '00000003-0000-0000-0000-000000000008',
    permissionCode: 'content:item:delete',
    permissionName: '内容删除',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 20,
  },
  {
    id: '00000003-0000-0000-0000-000000000009',
    permissionCode: 'content:version:read',
    permissionName: '版本查看',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 21,
  },
  {
    id: '00000003-0000-0000-0000-000000000010',
    permissionCode: 'content:relation:read',
    permissionName: '关联查看',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 22,
  },
  {
    id: '00000003-0000-0000-0000-000000000011',
    permissionCode: 'content:relation:update',
    permissionName: '关联编辑',
    moduleCode: 'content',
    permissionType: 'api',
    sortOrder: 23,
  },
] as const;

export class SeedContentPermissions1749862800000 implements MigrationInterface {
  name = 'SeedContentPermissions1749862800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const now = new Date();

    for (const perm of SEED_CONTENT_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (byId) {
        throw new Error(
          `SeedContentPermissions up(): fixed permission id ${perm.id} already exists. Refusing to proceed.`,
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
    const permIds = SEED_CONTENT_PERMISSIONS.map((p) => p.id);

    const rolePermRefs = await queryRunner.manager.count(SysRolePermission, {
      where: { permissionId: In(permIds) },
    });
    if (rolePermRefs > 0) {
      throw new Error(
        `SeedContentPermissions down(): ${rolePermRefs} role-permission association(s) reference seed content permissions. ` +
          'Refusing rollback to protect business data.',
      );
    }

    for (const perm of SEED_CONTENT_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existing) {
        continue;
      }
      if (existing.permissionCode !== perm.permissionCode) {
        throw new Error(
          `SeedContentPermissions down(): fixed permission id ${perm.id} has unexpected permissionCode. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysPermission, perm.id);
    }
  }
}
