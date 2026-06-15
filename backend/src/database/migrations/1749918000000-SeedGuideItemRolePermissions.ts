import { MigrationInterface, QueryRunner } from 'typeorm';
import { SysRole } from '../entities/sys-role.entity';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';
import {
  SEED_GUIDE_ITEM_PERMISSIONS,
  guideItemPermissionMatchesSeed,
} from './1749914400000-SeedGuideItemPermissions';

export const CONTENT_EDITOR_ROLE_ID = '00000001-0000-0000-0000-000000000002';
const CONTENT_EDITOR_ROLE_CODE = 'CONTENT_EDITOR';

// Fixed role-permission IDs — prefix 00000008.
export const SEED_GUIDE_ITEM_ROLE_PERMISSIONS = SEED_GUIDE_ITEM_PERMISSIONS.map((perm, index) => ({
  id: `00000008-0000-0000-0000-00000000000${index + 1}`,
  roleId: CONTENT_EDITOR_ROLE_ID,
  permissionId: perm.id,
})) as readonly {
  id: string;
  roleId: string;
  permissionId: string;
}[];

export class SeedGuideItemRolePermissions1749918000000 implements MigrationInterface {
  name = 'SeedGuideItemRolePermissions1749918000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const editorRole = await queryRunner.manager.findOne(SysRole, {
      where: { id: CONTENT_EDITOR_ROLE_ID },
      withDeleted: true,
    });
    if (!editorRole) {
      throw new Error(
        `SeedGuideItemRolePermissions up(): CONTENT_EDITOR role id ${CONTENT_EDITOR_ROLE_ID} does not exist. Refusing to proceed.`,
      );
    }
    if (editorRole.deletedAt != null) {
      throw new Error(
        `SeedGuideItemRolePermissions up(): CONTENT_EDITOR role id ${CONTENT_EDITOR_ROLE_ID} is logically deleted. Refusing to proceed.`,
      );
    }
    if (editorRole.status !== 'active') {
      throw new Error(
        `SeedGuideItemRolePermissions up(): CONTENT_EDITOR role id ${CONTENT_EDITOR_ROLE_ID} is not active (status="${editorRole.status}"). Refusing to proceed.`,
      );
    }
    if (editorRole.roleCode !== CONTENT_EDITOR_ROLE_CODE) {
      throw new Error(
        `SeedGuideItemRolePermissions up(): role id ${CONTENT_EDITOR_ROLE_ID} has unexpected roleCode "${editorRole.roleCode}". Refusing to proceed.`,
      );
    }

    for (const perm of SEED_GUIDE_ITEM_PERMISSIONS) {
      const existingPerm = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existingPerm) {
        throw new Error(
          `SeedGuideItemRolePermissions up(): fixed permission id ${perm.id} does not exist. Run SeedGuideItemPermissions first.`,
        );
      }
      if (!guideItemPermissionMatchesSeed(existingPerm, perm)) {
        throw new Error(
          `SeedGuideItemRolePermissions up(): permission id ${perm.id} has unexpected ownership fields. Refusing to proceed.`,
        );
      }
    }

    const now = new Date();

    for (const row of SEED_GUIDE_ITEM_ROLE_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysRolePermission, {
        where: { id: row.id },
      });
      if (byId) {
        if (byId.roleId !== row.roleId || byId.permissionId !== row.permissionId) {
          throw new Error(
            `SeedGuideItemRolePermissions up(): fixed role-permission id ${row.id} exists with unexpected values. Refusing to proceed.`,
          );
        }
        continue;
      }

      const byPair = await queryRunner.manager.findOne(SysRolePermission, {
        where: { roleId: row.roleId, permissionId: row.permissionId },
      });
      if (byPair) {
        continue;
      }

      await queryRunner.manager.insert(SysRolePermission, {
        id: row.id,
        roleId: row.roleId,
        permissionId: row.permissionId,
        createdAt: now,
      });
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const row of SEED_GUIDE_ITEM_ROLE_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysRolePermission, {
        where: { id: row.id },
      });
      if (!existing) {
        continue;
      }
      if (existing.roleId !== row.roleId || existing.permissionId !== row.permissionId) {
        throw new Error(
          `SeedGuideItemRolePermissions down(): fixed role-permission id ${row.id} has unexpected values. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysRolePermission, row.id);
    }
  }
}
