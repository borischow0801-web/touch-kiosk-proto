import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedGuideRolePermissions1749902400000,
  SEED_GUIDE_ROLE_PERMISSIONS,
  CONTENT_EDITOR_ROLE_ID,
} from '../src/database/migrations/1749902400000-SeedGuideRolePermissions';
import { SEED_GUIDE_PERMISSIONS } from '../src/database/migrations/1749898800000-SeedGuidePermissions';

const migration = new SeedGuideRolePermissions1749902400000();

interface RoleRow {
  id: string;
  roleCode: string;
  roleName: string;
  status: string;
  deletedAt: Date | null;
}

interface PermRow {
  id: string;
  permissionCode: string;
  permissionName: string;
  moduleCode: string;
  permissionType: string;
  sortOrder: number;
}

interface RolePermRow {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
}

function entityName(entity: unknown): string {
  return typeof entity === 'function' ? entity.name : (entity as { name: string }).name;
}

class InMemoryMigrationStore {
  roles = new Map<string, RoleRow>();
  permissions = new Map<string, PermRow>();
  rolePerms = new Map<string, RolePermRow>();

  reset(): void {
    this.roles.clear();
    this.permissions.clear();
    this.rolePerms.clear();
  }

  seedPrerequisites(): void {
    this.roles.set(CONTENT_EDITOR_ROLE_ID, {
      id: CONTENT_EDITOR_ROLE_ID,
      roleCode: 'CONTENT_EDITOR',
      roleName: '内容编辑员',
      status: 'active',
      deletedAt: null,
    });
    for (const perm of SEED_GUIDE_PERMISSIONS) {
      this.permissions.set(perm.id, {
        id: perm.id,
        permissionCode: perm.permissionCode,
        permissionName: perm.permissionName,
        moduleCode: perm.moduleCode,
        permissionType: perm.permissionType,
        sortOrder: perm.sortOrder,
      });
    }
  }

  findByPair(roleId: string, permissionId: string): RolePermRow | null {
    for (const row of this.rolePerms.values()) {
      if (row.roleId === roleId && row.permissionId === permissionId) return row;
    }
    return null;
  }
}

function createMockQueryRunner(store: InMemoryMigrationStore): QueryRunner {
  const manager = {
    async findOne<T>(
      entity: unknown,
      options?: { where?: Record<string, unknown>; withDeleted?: boolean },
    ) {
      const where = options?.where ?? {};
      const name = entityName(entity);
      if (name === 'SysRole') {
        if (where['id']) {
          return (store.roles.get(where['id'] as string) ?? null) as T | null;
        }
      }
      if (name === 'SysPermission') {
        if (where['id']) {
          return (store.permissions.get(where['id'] as string) ?? null) as T | null;
        }
      }
      if (name === 'SysRolePermission') {
        if (where['id']) {
          return (store.rolePerms.get(where['id'] as string) ?? null) as T | null;
        }
        if (where['roleId'] && where['permissionId']) {
          return store.findByPair(
            where['roleId'] as string,
            where['permissionId'] as string,
          ) as T | null;
        }
      }
      return null;
    },

    async insert(entity: unknown, values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const name = entityName(entity);
      for (const row of rows) {
        if (name === 'SysRolePermission') {
          store.rolePerms.set(row['id'] as string, row as unknown as RolePermRow);
        }
      }
    },

    async delete(entity: unknown, criteria: string | Record<string, unknown>) {
      const name = entityName(entity);
      if (name === 'SysRolePermission' && typeof criteria === 'string') {
        store.rolePerms.delete(criteria);
      }
    },
  };

  return { manager } as unknown as QueryRunner;
}

describe('SeedGuideRolePermissions1749902400000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('前置角色与权限齐全时 up 为 CONTENT_EDITOR 分配 8 个关联', async () => {
    store.seedPrerequisites();
    await migration.up(qr);
    expect(store.rolePerms.size).toBe(8);
    for (const row of store.rolePerms.values()) {
      expect(row.roleId).toBe(CONTENT_EDITOR_ROLE_ID);
    }
    await migration.down(qr);
    expect(store.rolePerms.size).toBe(0);
  });

  it('连续执行 up 两次安全', async () => {
    store.seedPrerequisites();
    await migration.up(qr);
    await migration.up(qr);
    expect(store.rolePerms.size).toBe(8);
  });

  it('CONTENT_EDITOR 角色不存在时 up 失败', async () => {
    for (const perm of SEED_GUIDE_PERMISSIONS) {
      store.permissions.set(perm.id, {
        id: perm.id,
        permissionCode: perm.permissionCode,
        permissionName: perm.permissionName,
        moduleCode: perm.moduleCode,
        permissionType: perm.permissionType,
        sortOrder: perm.sortOrder,
      });
    }
    await expect(migration.up(qr)).rejects.toThrow(/CONTENT_EDITOR role id .* does not exist/);
  });

  it('CONTENT_EDITOR roleCode 不匹配时 up 失败', async () => {
    store.seedPrerequisites();
    store.roles.set(CONTENT_EDITOR_ROLE_ID, {
      id: CONTENT_EDITOR_ROLE_ID,
      roleCode: 'WRONG_ROLE',
      roleName: '内容编辑员',
      status: 'active',
      deletedAt: null,
    });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected roleCode/);
  });

  it('CONTENT_EDITOR 已逻辑删除时 up 失败', async () => {
    store.seedPrerequisites();
    store.roles.set(CONTENT_EDITOR_ROLE_ID, {
      id: CONTENT_EDITOR_ROLE_ID,
      roleCode: 'CONTENT_EDITOR',
      roleName: '内容编辑员',
      status: 'active',
      deletedAt: new Date('2024-01-01'),
    });
    await expect(migration.up(qr)).rejects.toThrow(/logically deleted/);
  });

  it('CONTENT_EDITOR 状态不可用时 up 失败', async () => {
    store.seedPrerequisites();
    store.roles.set(CONTENT_EDITOR_ROLE_ID, {
      id: CONTENT_EDITOR_ROLE_ID,
      roleCode: 'CONTENT_EDITOR',
      roleName: '内容编辑员',
      status: 'disabled',
      deletedAt: null,
    });
    await expect(migration.up(qr)).rejects.toThrow(/is not active/);
  });

  it('固定权限 ID 缺失时 up 失败', async () => {
    store.roles.set(CONTENT_EDITOR_ROLE_ID, {
      id: CONTENT_EDITOR_ROLE_ID,
      roleCode: 'CONTENT_EDITOR',
      roleName: '内容编辑员',
      status: 'active',
      deletedAt: null,
    });
    await expect(migration.up(qr)).rejects.toThrow(/fixed permission id .* does not exist/);
  });

  it('固定权限归属字段不匹配时 up 失败', async () => {
    store.seedPrerequisites();
    const perm = SEED_GUIDE_PERMISSIONS[0];
    store.permissions.set(perm.id, {
      id: perm.id,
      permissionCode: perm.permissionCode,
      permissionName: '被篡改的名称',
      moduleCode: perm.moduleCode,
      permissionType: perm.permissionType,
      sortOrder: perm.sortOrder,
    });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected ownership fields/);
  });

  it('固定 role-permission ID 值不匹配时 up 失败', async () => {
    store.seedPrerequisites();
    const seed = SEED_GUIDE_ROLE_PERMISSIONS[0];
    store.rolePerms.set(seed.id, {
      id: seed.id,
      roleId: 'other-role',
      permissionId: seed.permissionId,
      createdAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected values/);
  });

  it('相同 role-permission 对已存在时 up 跳过', async () => {
    store.seedPrerequisites();
    const seed = SEED_GUIDE_ROLE_PERMISSIONS[0];
    const altId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    store.rolePerms.set(altId, {
      id: altId,
      roleId: seed.roleId,
      permissionId: seed.permissionId,
      createdAt: new Date(),
    });
    await migration.up(qr);
    expect(store.rolePerms.size).toBe(8);
    expect(store.findByPair(seed.roleId, seed.permissionId)?.id).toBe(altId);
  });

  it('down 不删除不属于本迁移的 role-permission', async () => {
    store.seedPrerequisites();
    const foreignId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    store.rolePerms.set(foreignId, {
      id: foreignId,
      roleId: 'other-role',
      permissionId: 'other-perm',
      createdAt: new Date(),
    });
    await migration.up(qr);
    await migration.down(qr);
    expect(store.rolePerms.has(foreignId)).toBe(true);
    expect(store.rolePerms.size).toBe(1);
  });

  it('固定 ID 值不匹配时 down 拒绝', async () => {
    store.seedPrerequisites();
    await migration.up(qr);
    const seed = SEED_GUIDE_ROLE_PERMISSIONS[0];
    const row = store.rolePerms.get(seed.id)!;
    row.roleId = 'tampered-role';
    await expect(migration.down(qr)).rejects.toThrow(/unexpected values/);
  });
});
