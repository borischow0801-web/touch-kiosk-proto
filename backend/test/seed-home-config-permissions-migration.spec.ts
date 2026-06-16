import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedHomeConfigPermissions1749928800000,
  SEED_HOME_CONFIG_PERMISSIONS,
  homeConfigPermissionMatchesSeed,
} from '../src/database/migrations/1749928800000-SeedHomeConfigPermissions';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';

const migration = new SeedHomeConfigPermissions1749928800000();

interface PermRow {
  id: string;
  permissionCode: string;
  permissionName: string;
  moduleCode: string;
  permissionType: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RolePermRow {
  roleId: string;
  permissionId: string;
}

function entityName(entity: unknown): string {
  return typeof entity === 'function' ? entity.name : (entity as { name: string }).name;
}

function extractInValues(value: unknown): string[] | null {
  if (!value || typeof value !== 'object') return null;
  const op = value as { _type?: string; value?: string[] };
  if (op._type === 'in' && Array.isArray(op.value)) return op.value;
  return null;
}

class InMemoryMigrationStore {
  permissions = new Map<string, PermRow>();
  rolePerms: RolePermRow[] = [];

  reset(): void {
    this.permissions.clear();
    this.rolePerms = [];
  }
}

function createMockQueryRunner(store: InMemoryMigrationStore): QueryRunner {
  const manager = {
    async findOne<T>(entity: unknown, options?: { where?: Record<string, unknown> }) {
      const where = options?.where ?? {};
      const name = entityName(entity);
      if (name === 'SysPermission') {
        if (where['id']) {
          return (store.permissions.get(where['id'] as string) ?? null) as T | null;
        }
        if (where['permissionCode']) {
          for (const row of store.permissions.values()) {
            if (row.permissionCode === where['permissionCode']) return row as T;
          }
          return null;
        }
      }
      return null;
    },

    async insert(entity: unknown, values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const name = entityName(entity);
      for (const row of rows) {
        if (name === 'SysPermission') {
          store.permissions.set(row['id'] as string, row as unknown as PermRow);
        }
      }
    },

    async delete(entity: unknown, criteria: string | Record<string, unknown>) {
      const name = entityName(entity);
      if (name === 'SysPermission' && typeof criteria === 'string') {
        store.permissions.delete(criteria);
      }
    },

    async count(entity: unknown, options?: { where?: Record<string, unknown> }) {
      const name = entityName(entity);
      if (name === 'SysRolePermission') {
        const permIds = extractInValues(options?.where?.['permissionId']) ?? [];
        return store.rolePerms.filter((rp) => permIds.includes(rp.permissionId)).length;
      }
      return 0;
    },
  };

  return { manager } as unknown as QueryRunner;
}

describe('SeedHomeConfigPermissions1749928800000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('空数据库时 up 插入 7 个首页权限', async () => {
    await migration.up(qr);
    expect(store.permissions.size).toBe(7);
    const codes = [...store.permissions.values()].map((p) => p.permissionCode).sort();
    expect(codes).toEqual(
      [
        'home:config:read',
        'home:config:update',
        'home:module:read',
        'home:module:create',
        'home:module:update',
        'home:module:delete',
        'home:module:sort',
      ].sort(),
    );
    await migration.down(qr);
    expect(store.permissions.size).toBe(0);
  });

  it('连续执行 up 两次不会重复插入或失败', async () => {
    await migration.up(qr);
    await migration.up(qr);
    expect(store.permissions.size).toBe(7);
  });

  it('固定 ID 内容一致时 up 跳过', async () => {
    const seedPerm = SEED_HOME_CONFIG_PERMISSIONS[0];
    store.permissions.set(seedPerm.id, {
      id: seedPerm.id,
      permissionCode: seedPerm.permissionCode,
      permissionName: seedPerm.permissionName,
      moduleCode: seedPerm.moduleCode,
      permissionType: seedPerm.permissionType,
      sortOrder: seedPerm.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await migration.up(qr);
    expect(store.permissions.size).toBe(7);
  });

  it('固定权限 ID 归属字段不一致时 up 失败', async () => {
    const seedPerm = SEED_HOME_CONFIG_PERMISSIONS[0];
    store.permissions.set(seedPerm.id, {
      id: seedPerm.id,
      permissionCode: seedPerm.permissionCode,
      permissionName: '被篡改的名称',
      moduleCode: seedPerm.moduleCode,
      permissionType: seedPerm.permissionType,
      sortOrder: seedPerm.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected ownership fields/);
  });

  it('相同 permissionCode、不同 ID 时 up 明确失败', async () => {
    const altId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const seedPerm = SEED_HOME_CONFIG_PERMISSIONS[0];
    store.permissions.set(altId, {
      id: altId,
      permissionCode: seedPerm.permissionCode,
      permissionName: '已有权限',
      moduleCode: 'home',
      permissionType: 'api',
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/permissionCode .* already exists with id/);
    expect(store.permissions.has(seedPerm.id)).toBe(false);
  });

  it('有 role-permission 引用时 down 拒绝', async () => {
    await migration.up(qr);
    store.rolePerms.push({
      roleId: 'role-editor-001',
      permissionId: SEED_HOME_CONFIG_PERMISSIONS[0].id,
    });
    await expect(migration.down(qr)).rejects.toThrow(/role-permission association/);
    expect(store.permissions.size).toBe(7);
  });

  it('homeConfigPermissionMatchesSeed 比较全部归属字段', () => {
    const seedPerm = SEED_HOME_CONFIG_PERMISSIONS[0];
    expect(
      homeConfigPermissionMatchesSeed(
        {
          permissionCode: seedPerm.permissionCode,
          permissionName: seedPerm.permissionName,
          moduleCode: seedPerm.moduleCode,
          permissionType: seedPerm.permissionType,
          sortOrder: seedPerm.sortOrder,
        },
        seedPerm,
      ),
    ).toBe(true);
  });
});
