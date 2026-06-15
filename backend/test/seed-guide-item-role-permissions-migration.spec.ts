import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedGuideItemRolePermissions1749918000000,
  SEED_GUIDE_ITEM_ROLE_PERMISSIONS,
  CONTENT_EDITOR_ROLE_ID,
} from '../src/database/migrations/1749918000000-SeedGuideItemRolePermissions';
import { SEED_GUIDE_ITEM_PERMISSIONS } from '../src/database/migrations/1749914400000-SeedGuideItemPermissions';

const migration = new SeedGuideItemRolePermissions1749918000000();

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
    for (const perm of SEED_GUIDE_ITEM_PERMISSIONS) {
      this.permissions.set(perm.id, { ...perm });
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
      if (name === 'SysRole' && where['id']) {
        return (store.roles.get(where['id'] as string) ?? null) as T | null;
      }
      if (name === 'SysPermission' && where['id']) {
        return (store.permissions.get(where['id'] as string) ?? null) as T | null;
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

describe('SeedGuideItemRolePermissions1749918000000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('前置齐全时 up 分配 4 个事项权限关联', async () => {
    store.seedPrerequisites();
    await migration.up(qr);
    expect(store.rolePerms.size).toBe(4);
    await migration.down(qr);
    expect(store.rolePerms.size).toBe(0);
  });

  it('连续 up 两次安全', async () => {
    store.seedPrerequisites();
    await migration.up(qr);
    await migration.up(qr);
    expect(store.rolePerms.size).toBe(4);
  });

  it('角色不存在时失败', async () => {
    for (const perm of SEED_GUIDE_ITEM_PERMISSIONS) {
      store.permissions.set(perm.id, { ...perm });
    }
    await expect(migration.up(qr)).rejects.toThrow(/does not exist/);
  });

  it('角色已逻辑删除时失败', async () => {
    store.seedPrerequisites();
    store.roles.set(CONTENT_EDITOR_ROLE_ID, {
      id: CONTENT_EDITOR_ROLE_ID,
      roleCode: 'CONTENT_EDITOR',
      roleName: '内容编辑员',
      status: 'active',
      deletedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/logically deleted/);
  });

  it('权限归属字段不匹配时失败', async () => {
    store.seedPrerequisites();
    const perm = SEED_GUIDE_ITEM_PERMISSIONS[0];
    store.permissions.set(perm.id, { ...perm, permissionName: '篡改' });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected ownership fields/);
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

  it('CONTENT_EDITOR status 为 disabled 时 up 失败', async () => {
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

  it('固定 role-permission ID 被其他数据占用时 up 拒绝', async () => {
    store.seedPrerequisites();
    const seed = SEED_GUIDE_ITEM_ROLE_PERMISSIONS[0];
    store.rolePerms.set(seed.id, {
      id: seed.id,
      roleId: 'other-role',
      permissionId: seed.permissionId,
      createdAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected values/);
  });

  it('相同 roleId + permissionId 已由不同 ID 关联时 up 幂等跳过', async () => {
    store.seedPrerequisites();
    const seed = SEED_GUIDE_ITEM_ROLE_PERMISSIONS[0];
    const altId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    store.rolePerms.set(altId, {
      id: altId,
      roleId: seed.roleId,
      permissionId: seed.permissionId,
      createdAt: new Date(),
    });
    await migration.up(qr);
    expect(store.rolePerms.size).toBe(4);
    expect(store.findByPair(seed.roleId, seed.permissionId)?.id).toBe(altId);
  });

  it('down 不删除外来同 pair 关联', async () => {
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

  it('固定 ID 归属被修改时 down 拒绝', async () => {
    store.seedPrerequisites();
    await migration.up(qr);
    const seed = SEED_GUIDE_ITEM_ROLE_PERMISSIONS[0];
    const row = store.rolePerms.get(seed.id)!;
    row.roleId = 'tampered-role';
    await expect(migration.down(qr)).rejects.toThrow(/unexpected values/);
  });
});
