import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedPublishPermissions1749884400000,
  SEED_PUBLISH_PERMISSIONS,
} from '../src/database/migrations/1749884400000-SeedPublishPermissions';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';

const migration = new SeedPublishPermissions1749884400000();

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
      if (entityName(entity) === 'SysPermission') {
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
      for (const row of rows) {
        if (entityName(entity) === 'SysPermission') {
          store.permissions.set(row['id'] as string, row as unknown as PermRow);
        }
        if (entityName(entity) === 'SysRolePermission') {
          store.rolePerms.push(row as unknown as RolePermRow);
        }
      }
    },
    async delete(entity: unknown, criteria: string) {
      if (entityName(entity) === 'SysPermission') {
        store.permissions.delete(criteria);
      }
    },
    async count(entity: unknown, options?: { where?: Record<string, unknown> }) {
      if (entityName(entity) === 'SysRolePermission') {
        const permIds = extractInValues(options?.where?.['permissionId']) ?? [];
        return store.rolePerms.filter((rp) => permIds.includes(rp.permissionId)).length;
      }
      return 0;
    },
  };
  return { manager } as unknown as QueryRunner;
}

describe('SeedPublishPermissions1749884400000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('空数据库时 up 插入 7 个发布权限', async () => {
    await migration.up(qr);
    expect(store.permissions.size).toBe(7);
    await migration.down(qr);
    expect(store.permissions.size).toBe(0);
  });

  it('固定权限 ID 被其他 permissionCode 占用时 up 失败', async () => {
    const seedPerm = SEED_PUBLISH_PERMISSIONS[0];
    store.permissions.set(seedPerm.id, {
      id: seedPerm.id,
      permissionCode: 'other:code',
      permissionName: '冲突',
      moduleCode: 'publish',
      permissionType: 'api',
      sortOrder: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/fixed permission id .* already exists/);
  });

  it('相同 permissionCode、不同 ID 时不覆盖、不新增', async () => {
    const altId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const seedPerm = SEED_PUBLISH_PERMISSIONS[0];
    store.permissions.set(altId, {
      id: altId,
      permissionCode: seedPerm.permissionCode,
      permissionName: '已有',
      moduleCode: 'publish',
      permissionType: 'api',
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await migration.up(qr);
    expect([...store.permissions.values()].filter((p) => p.permissionCode === seedPerm.permissionCode)).toHaveLength(1);
    await migration.down(qr);
    expect(store.permissions.has(altId)).toBe(true);
  });

  it('有 role-permission 引用时 down 拒绝', async () => {
    await migration.up(qr);
    store.rolePerms.push({ roleId: 'role-1', permissionId: SEED_PUBLISH_PERMISSIONS[0].id });
    await expect(migration.down(qr)).rejects.toThrow(/role-permission association/);
    expect(store.permissions.size).toBe(7);
  });

  it('down 只删除本迁移固定 ID 数据', async () => {
    const altId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    store.permissions.set(altId, {
      id: altId,
      permissionCode: 'publish:legacy',
      permissionName: '遗留',
      moduleCode: 'publish',
      permissionType: 'api',
      sortOrder: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await migration.up(qr);
    await migration.down(qr);
    expect(store.permissions.has(altId)).toBe(true);
    expect(store.permissions.has(SEED_PUBLISH_PERMISSIONS[0].id)).toBe(false);
  });
});
