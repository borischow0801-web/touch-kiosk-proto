import { MigrationInterface, QueryRunner } from 'typeorm';
import { SysRole } from '../entities/sys-role.entity';
import { SysPermission } from '../entities/sys-permission.entity';
import { SysRolePermission } from '../entities/sys-role-permission.entity';
import {
  SEED_HOME_CONFIG_PERMISSIONS,
  homeConfigPermissionMatchesSeed,
} from './1749928800000-SeedHomeConfigPermissions';

export const CONTENT_EDITOR_ROLE_ID = '00000001-0000-0000-0000-000000000002';
const CONTENT_EDITOR_ROLE_CODE = 'CONTENT_EDITOR';

// Fixed role-permission IDs — prefix 0000000a.
export const SEED_HOME_CONFIG_ROLE_PERMISSIONS = SEED_HOME_CONFIG_PERMISSIONS.map((perm, index) => ({
  id: `0000000a-0000-0000-0000-00000000000${index + 1}`,
  roleId: CONTENT_EDITOR_ROLE_ID,
  permissionId: perm.id,
})) as readonly {
  id: string;
  roleId: string;
  permissionId: string;
}[];

export class SeedHomeConfigRolePermissions1749932400000 implements MigrationInterface {
  name = 'SeedHomeConfigRolePermissions1749932400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const editorRole = await queryRunner.manager.findOne(SysRole, {
      where: { id: CONTENT_EDITOR_ROLE_ID },
      withDeleted: true,
    });
    if (!editorRole) {
      throw new Error(
        `SeedHomeConfigRolePermissions up(): CONTENT_EDITOR role id ${CONTENT_EDITOR_ROLE_ID} does not exist. Refusing to proceed.`,
      );
    }
    if (editorRole.deletedAt != null) {
      throw new Error(
        `SeedHomeConfigRolePermissions up(): CONTENT_EDITOR role id ${CONTENT_EDITOR_ROLE_ID} is logically deleted. Refusing to proceed.`,
      );
    }
    if (editorRole.status !== 'active') {
      throw new Error(
        `SeedHomeConfigRolePermissions up(): CONTENT_EDITOR role id ${CONTENT_EDITOR_ROLE_ID} is not active (status="${editorRole.status}"). Refusing to proceed.`,
      );
    }
    if (editorRole.roleCode !== CONTENT_EDITOR_ROLE_CODE) {
      throw new Error(
        `SeedHomeConfigRolePermissions up(): role id ${CONTENT_EDITOR_ROLE_ID} has unexpected roleCode "${editorRole.roleCode}". Refusing to proceed.`,
      );
    }

    for (const perm of SEED_HOME_CONFIG_PERMISSIONS) {
      const existingPerm = await queryRunner.manager.findOne(SysPermission, {
        where: { id: perm.id },
      });
      if (!existingPerm) {
        throw new Error(
          `SeedHomeConfigRolePermissions up(): fixed permission id ${perm.id} does not exist. Run SeedHomeConfigPermissions first.`,
        );
      }
      if (!homeConfigPermissionMatchesSeed(existingPerm, perm)) {
        throw new Error(
          `SeedHomeConfigRolePermissions up(): permission id ${perm.id} has unexpected ownership fields. Refusing to proceed.`,
        );
      }
    }

    const now = new Date();

    for (const row of SEED_HOME_CONFIG_ROLE_PERMISSIONS) {
      const byId = await queryRunner.manager.findOne(SysRolePermission, {
        where: { id: row.id },
      });
      if (byId) {
        if (byId.roleId !== row.roleId || byId.permissionId !== row.permissionId) {
          throw new Error(
            `SeedHomeConfigRolePermissions up(): fixed role-permission id ${row.id} exists with unexpected values. Refusing to proceed.`,
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
    for (const row of SEED_HOME_CONFIG_ROLE_PERMISSIONS) {
      const existing = await queryRunner.manager.findOne(SysRolePermission, {
        where: { id: row.id },
      });
      if (!existing) {
        continue;
      }
      if (existing.roleId !== row.roleId || existing.permissionId !== row.permissionId) {
        throw new Error(
          `SeedHomeConfigRolePermissions down(): fixed role-permission id ${row.id} has unexpected values. Refusing rollback.`,
        );
      }
      await queryRunner.manager.delete(SysRolePermission, row.id);
    }
  }
}
