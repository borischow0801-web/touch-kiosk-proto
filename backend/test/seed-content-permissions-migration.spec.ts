import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedContentPermissions1749862800000,
  SEED_CONTENT_PERMISSIONS,
} from '../src/database/migrations/1749862800000-SeedContentPermissions';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';

const migration = new SeedContentPermissions1749862800000();

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
  id?: string;
  roleId: string;
  permissionId: string;
  createdAt?: Date;
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
        if (name === 'SysRolePermission') {
          store.rolePerms.push(row as unknown as RolePermRow);
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

describe('SeedContentPermissions1749862800000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('空数据库时 up 插入 11 个内容权限', async () => {
    await migration.up(qr);
    expect(store.permissions.size).toBe(11);
    await migration.down(qr);
    expect(store.permissions.size).toBe(0);
  });

  it('固定权限 ID 被其他 permissionCode 占用时 up 失败', async () => {
    const seedPerm = SEED_CONTENT_PERMISSIONS[0];
    store.permissions.set(seedPerm.id, {
      id: seedPerm.id,
      permissionCode: 'other:permission:code',
      permissionName: '冲突',
      moduleCode: 'system',
      permissionType: 'api',
      sortOrder: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(migration.up(qr)).rejects.toThrow(/fixed permission id .* already exists/);
  });

  it('固定 ID 和相同 code 已存在时 up 拒绝', async () => {
    const seedPerm = SEED_CONTENT_PERMISSIONS[0];
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
    await expect(migration.up(qr)).rejects.toThrow(/fixed permission id .* already exists/);
  });

  it('相同 permissionCode、不同 ID 时不覆盖、不新增', async () => {
    const altId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const seedPerm = SEED_CONTENT_PERMISSIONS[0];
    store.permissions.set(altId, {
      id: altId,
      permissionCode: seedPerm.permissionCode,
      permissionName: '已有权限',
      moduleCode: 'content',
      permissionType: 'api',
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await migration.up(qr);
    const readPerms = [...store.permissions.values()].filter(
      (p) => p.permissionCode === seedPerm.permissionCode,
    );
    expect(readPerms).toHaveLength(1);
    expect(readPerms[0].id).toBe(altId);
    await migration.down(qr);
    expect(store.permissions.has(altId)).toBe(true);
  });

  it('有 role-permission 引用时 down 拒绝', async () => {
    await migration.up(qr);
    store.rolePerms.push({
      roleId: 'role-editor-001',
      permissionId: SEED_CONTENT_PERMISSIONS[0].id,
    });
    await expect(migration.down(qr)).rejects.toThrow(/role-permission association/);
    expect(store.permissions.size).toBe(11);
  });

  it('down 只删除本迁移固定 ID 数据', async () => {
    const altPermId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    store.permissions.set(altPermId, {
      id: altPermId,
      permissionCode: 'content:legacy:read',
      permissionName: '迁移前权限',
      moduleCode: 'content',
      permissionType: 'api',
      sortOrder: 99,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await migration.up(qr);
    await migration.down(qr);
    expect(store.permissions.has(altPermId)).toBe(true);
    expect(store.permissions.has(SEED_CONTENT_PERMISSIONS[0].id)).toBe(false);
  });

  it('固定 ID 对应 code 不匹配时 down 拒绝', async () => {
    await migration.up(qr);
    const row = store.permissions.get(SEED_CONTENT_PERMISSIONS[0].id)!;
    row.permissionCode = 'TAMPERED_CODE';
    await expect(migration.down(qr)).rejects.toThrow(/unexpected permissionCode/);
    expect(store.permissions.get(SEED_CONTENT_PERMISSIONS[0].id)?.permissionCode).toBe(
      'TAMPERED_CODE',
    );
  });
});
