import 'reflect-metadata';
import { QueryRunner } from 'typeorm';
import {
  SeedRbacData1749772800000,
  SEED_ROLES,
  SEED_PERMISSIONS,
} from '../src/database/migrations/1749772800000-SeedRbacData';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';

const migration = new SeedRbacData1749772800000();

interface RoleRow {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

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

interface UserRoleRow {
  id?: string;
  userId: string;
  roleId: string;
  createdAt?: Date;
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
  roles = new Map<string, RoleRow>();
  permissions = new Map<string, PermRow>();
  userRoles: UserRoleRow[] = [];
  rolePerms: RolePermRow[] = [];

  reset(): void {
    this.roles.clear();
    this.permissions.clear();
    this.userRoles = [];
    this.rolePerms = [];
  }
}

function createMockQueryRunner(store: InMemoryMigrationStore): QueryRunner {
  const manager = {
    async findOne<T>(entity: unknown, options?: { where?: Record<string, unknown>; withDeleted?: boolean }) {
      const where = options?.where ?? {};
      const name = entityName(entity);
      if (name === 'SysRole') {
        if (where['id']) {
          const row = store.roles.get(where['id'] as string);
          if (!row) return null;
          if (!options?.withDeleted && row.deletedAt) return null;
          return row as T;
        }
        if (where['roleCode']) {
          for (const row of store.roles.values()) {
            if (row.roleCode === where['roleCode']) {
              if (!options?.withDeleted && row.deletedAt) continue;
              return row as T;
            }
          }
          return null;
        }
      }
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

    async find<T>(entity: unknown) {
      const name = entityName(entity);
      if (name === 'SysRole') return [...store.roles.values()] as T[];
      if (name === 'SysPermission') return [...store.permissions.values()] as T[];
      return [] as T[];
    },

    async insert(entity: unknown, values: Record<string, unknown> | Record<string, unknown>[]) {
      const rows = Array.isArray(values) ? values : [values];
      const name = entityName(entity);
      for (const row of rows) {
        if (name === 'SysRole') {
          store.roles.set(row['id'] as string, {
            ...(row as unknown as RoleRow),
            deletedAt: null,
          });
        }
        if (name === 'SysPermission') {
          store.permissions.set(row['id'] as string, row as unknown as PermRow);
        }
        if (name === 'SysUserRole') {
          store.userRoles.push(row as unknown as UserRoleRow);
        }
        if (name === 'SysRolePermission') {
          store.rolePerms.push(row as unknown as RolePermRow);
        }
      }
    },

    async delete(entity: unknown, criteria: string | Record<string, unknown>) {
      const name = entityName(entity);
      if (name === 'SysRole' && typeof criteria === 'string') {
        store.roles.delete(criteria);
      }
      if (name === 'SysPermission' && typeof criteria === 'string') {
        store.permissions.delete(criteria);
      }
    },

    async update(entity: unknown, id: string, patch: Partial<RoleRow>) {
      if (entityName(entity) === 'SysRole') {
        const row = store.roles.get(id);
        if (row) Object.assign(row, patch);
      }
    },

    async count(entity: unknown, options?: { where?: Record<string, unknown> | Record<string, unknown>[] }) {
      const name = entityName(entity);
      if (name === 'SysUserRole') {
        const where = options?.where as { roleId?: unknown } | undefined;
        const ids = extractInValues(where?.roleId) ?? [];
        return store.userRoles.filter((ur) => ids.includes(ur.roleId)).length;
      }
      if (name === 'SysRolePermission') {
        const wheres = Array.isArray(options?.where) ? options.where : [options?.where ?? {}];
        return store.rolePerms.filter((rp) =>
          wheres.some((w) => {
            const roleIds = extractInValues((w as { roleId?: unknown }).roleId);
            const permIds = extractInValues((w as { permissionId?: unknown }).permissionId);
            return (
              (roleIds?.includes(rp.roleId) ?? false) ||
              (permIds?.includes(rp.permissionId) ?? false)
            );
          }),
        ).length;
      }
      return 0;
    },
  };

  return { manager } as unknown as QueryRunner;
}

describe('SeedRbacData1749772800000 — migration behavior', () => {
  const store = new InMemoryMigrationStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('空数据库时 up 插入 3 个角色和 12 个权限', async () => {
    await migration.up(qr);
    expect(store.roles.size).toBe(3);
    expect(store.permissions.size).toBe(12);
    expect([...store.roles.values()].map((r) => r.roleCode).sort()).toEqual(
      ['CONTENT_EDITOR', 'PUBLISH_REVIEWER', 'SUPER_ADMIN'].sort(),
    );
    await migration.down(qr);
    expect(store.roles.size).toBe(0);
    expect(store.permissions.size).toBe(0);
  });

  it('固定角色 ID 被其他 roleCode 占用时 up 失败', async () => {
    const seedRole = SEED_ROLES[0];
    store.roles.set(seedRole.id, {
      id: seedRole.id,
      roleCode: 'OTHER_ROLE_CODE',
      roleName: '冲突',
      description: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await expect(migration.up(qr)).rejects.toThrow(/fixed role id .* already exists/);
  });

  it('固定权限 ID 被其他 permissionCode 占用时 up 失败', async () => {
    const seedPerm = SEED_PERMISSIONS[0];
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
    const seedRole = SEED_ROLES[0];
    store.roles.set(seedRole.id, {
      id: seedRole.id,
      roleCode: seedRole.roleCode,
      roleName: seedRole.roleName,
      description: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await expect(migration.up(qr)).rejects.toThrow(/fixed role id .* already exists/);
  });

  it('相同 roleCode、不同 ID 时不覆盖、不新增', async () => {
    const altId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    store.roles.set(altId, {
      id: altId,
      roleCode: 'SUPER_ADMIN',
      roleName: '已有超管',
      description: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await migration.up(qr);
    const saRoles = [...store.roles.values()].filter((r) => r.roleCode === 'SUPER_ADMIN');
    expect(saRoles).toHaveLength(1);
    expect(saRoles[0].id).toBe(altId);
    expect(store.roles.has(SEED_ROLES[0].id)).toBe(false);
    await migration.down(qr);
    expect(store.roles.has(altId)).toBe(true);
  });

  it('相同 permissionCode、不同 ID 时不覆盖、不新增', async () => {
    const altId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    store.permissions.set(altId, {
      id: altId,
      permissionCode: 'system:user:read',
      permissionName: '已有权限',
      moduleCode: 'system',
      permissionType: 'api',
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await migration.up(qr);
    const readPerms = [...store.permissions.values()].filter(
      (p) => p.permissionCode === 'system:user:read',
    );
    expect(readPerms).toHaveLength(1);
    expect(readPerms[0].id).toBe(altId);
    await migration.down(qr);
    expect(store.permissions.has(altId)).toBe(true);
  });

  it('有 user-role 引用时 down 拒绝', async () => {
    await migration.up(qr);
    store.userRoles.push({ userId: 'user-1', roleId: SEED_ROLES[0].id });
    await expect(migration.down(qr)).rejects.toThrow(/user-role association/);
    expect(store.roles.size).toBe(3);
  });

  it('有 role-permission 引用时 down 拒绝', async () => {
    await migration.up(qr);
    store.rolePerms.push({ roleId: SEED_ROLES[1].id, permissionId: SEED_PERMISSIONS[0].id });
    await expect(migration.down(qr)).rejects.toThrow(/role-permission association/);
    expect(store.permissions.size).toBe(12);
  });

  it('down 只删除本迁移固定 ID 数据', async () => {
    const altRoleId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    store.roles.set(altRoleId, {
      id: altRoleId,
      roleCode: 'LEGACY_ROLE',
      roleName: '迁移前角色',
      description: null,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await migration.up(qr);
    await migration.down(qr);
    expect(store.roles.has(altRoleId)).toBe(true);
    expect(store.roles.has(SEED_ROLES[0].id)).toBe(false);
  });

  it('固定 ID 对应 code 不匹配时 down 拒绝', async () => {
    await migration.up(qr);
    const row = store.roles.get(SEED_ROLES[0].id)!;
    row.roleCode = 'TAMPERED_CODE';
    await expect(migration.down(qr)).rejects.toThrow(/unexpected roleCode/);
    expect(store.roles.get(SEED_ROLES[0].id)?.roleCode).toBe('TAMPERED_CODE');
  });

  it('up/down/up 后数据数量和 code 正确', async () => {
    await migration.up(qr);
    expect(store.roles.size).toBe(3);
    expect(store.permissions.size).toBe(12);

    await migration.down(qr);
    expect(store.roles.size).toBe(0);
    expect(store.permissions.size).toBe(0);

    await migration.up(qr);
    expect(store.roles.size).toBe(3);
    expect(store.permissions.size).toBe(12);
    expect([...store.roles.values()].map((r) => r.roleCode).sort()).toEqual(
      SEED_ROLES.map((r) => r.roleCode).sort(),
    );
    expect([...store.permissions.values()].map((p) => p.permissionCode).sort()).toEqual(
      SEED_PERMISSIONS.map((p) => p.permissionCode).sort(),
    );
    await migration.down(qr);
  });
});
