import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedGuideItemPermissions1749914400000,
  SEED_GUIDE_ITEM_PERMISSIONS,
  guideItemPermissionMatchesSeed,
} from '../src/database/migrations/1749914400000-SeedGuideItemPermissions';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';

const migration = new SeedGuideItemPermissions1749914400000();

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

describe('SeedGuideItemPermissions1749914400000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('空数据库时 up 插入 4 个事项配置权限', async () => {
    await migration.up(qr);
    expect(store.permissions.size).toBe(4);
    await migration.down(qr);
    expect(store.permissions.size).toBe(0);
  });

  it('连续执行 up 两次幂等', async () => {
    await migration.up(qr);
    await migration.up(qr);
    expect(store.permissions.size).toBe(4);
  });

  it('相同 permissionCode 不同 ID 时 up 失败', async () => {
    const seedPerm = SEED_GUIDE_ITEM_PERMISSIONS[0];
    store.permissions.set('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      permissionCode: seedPerm.permissionCode,
      permissionName: '已有',
      moduleCode: 'guide',
      permissionType: 'api',
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/permissionCode .* already exists/);
  });

  it('固定权限 ID 被其他归属数据占用时 up 拒绝', async () => {
    const seedPerm = SEED_GUIDE_ITEM_PERMISSIONS[0];
    store.permissions.set(seedPerm.id, {
      id: seedPerm.id,
      permissionCode: 'wrong:code',
      permissionName: seedPerm.permissionName,
      moduleCode: seedPerm.moduleCode,
      permissionType: seedPerm.permissionType,
      sortOrder: seedPerm.sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/unexpected ownership fields/);
  });

  it('有 role-permission 引用时 down 拒绝', async () => {
    await migration.up(qr);
    store.rolePerms.push({
      roleId: 'role-1',
      permissionId: SEED_GUIDE_ITEM_PERMISSIONS[0].id,
    });
    await expect(migration.down(qr)).rejects.toThrow(/role-permission association/);
  });

  it('down 归属字段不一致时拒绝', async () => {
    await migration.up(qr);
    const row = store.permissions.get(SEED_GUIDE_ITEM_PERMISSIONS[0].id)!;
    row.permissionName = '篡改';
    await expect(migration.down(qr)).rejects.toThrow(/unexpected ownership fields/);
  });

  it('guideItemPermissionMatchesSeed 校验全部字段', () => {
    const seed = SEED_GUIDE_ITEM_PERMISSIONS[0];
    expect(
      guideItemPermissionMatchesSeed(
        {
          permissionCode: seed.permissionCode,
          permissionName: seed.permissionName,
          moduleCode: seed.moduleCode,
          permissionType: seed.permissionType,
          sortOrder: seed.sortOrder,
        },
        seed,
      ),
    ).toBe(true);
  });
});
