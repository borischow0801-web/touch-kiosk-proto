import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';
import { CreateContentTables1749859200000 } from '../src/database/migrations/1749859200000-CreateContentTables';
import { AlterContentTablesIntegrity1749873600000 } from '../src/database/migrations/1749873600000-AlterContentTablesIntegrity';
const createMigration = new CreateContentTables1749859200000();
const alterMigration = new AlterContentTablesIntegrity1749873600000();

const ALTER_OWNED_INDEX = 'uk_content_version_content_version_no';
const ALTER_OWNED_FK = 'fk_content_item_current_version_id';

interface ColumnMeta {
  name: string;
  type: string;
}

interface IndexMeta {
  name: string;
  columnNames: string[];
  isUnique: boolean;
}

interface ForeignKeyMeta {
  name: string;
  columnNames: string[];
  referencedTableName: string;
  referencedColumnNames: string[];
}

interface TableMeta {
  columns: Map<string, ColumnMeta>;
  indices: IndexMeta[];
  foreignKeys: ForeignKeyMeta[];
}

class ContentSchemaStore {
  tables = new Map<string, TableMeta>();
  clearedCurrentVersionIds = false;

  reset(): void {
    this.tables.clear();
    this.clearedCurrentVersionIds = false;
  }

  seedPostCreateTables(): void {
    this.reset();
    this.tables.set('content_item', {
      columns: new Map([
        ['is_top', { name: 'is_top', type: 'smallint' }],
        ['is_recommend', { name: 'is_recommend', type: 'smallint' }],
        ['current_version_id', { name: 'current_version_id', type: 'varchar' }],
      ]),
      indices: [],
      foreignKeys: [],
    });
    this.tables.set('content_version', {
      columns: new Map([
        ['content_id', { name: 'content_id', type: 'varchar' }],
        ['version_no', { name: 'version_no', type: 'int' }],
      ]),
      indices: [
        { name: 'idx_content_version_content_id', columnNames: ['content_id'], isUnique: false },
      ],
      foreignKeys: [],
    });
  }

  seedLegacyTinyint(): void {
    this.seedPostCreateTables();
    this.tables.get('content_item')!.columns.set('is_top', { name: 'is_top', type: 'tinyint' });
    this.tables
      .get('content_item')!
      .columns.set('is_recommend', { name: 'is_recommend', type: 'tinyint' });
  }

  ensureTable(name: string): TableMeta {
    if (!this.tables.has(name)) {
      this.tables.set(name, { columns: new Map(), indices: [], foreignKeys: [] });
    }
    return this.tables.get(name)!;
  }

  toTypeOrmTable(name: string): Table {
    const meta = this.tables.get(name);
    if (!meta) {
      return new Table({ name, columns: [], indices: [], foreignKeys: [] });
    }
    return new Table({
      name,
      columns: [...meta.columns.values()].map(
        (c) =>
          new TableColumn({
            name: c.name,
            type: c.type,
          }),
      ),
      indices: meta.indices.map(
        (idx) =>
          new TableIndex({
            name: idx.name,
            columnNames: idx.columnNames,
            isUnique: idx.isUnique,
          }),
      ),
      foreignKeys: meta.foreignKeys.map(
        (fk) =>
          new TableForeignKey({
            name: fk.name,
            columnNames: fk.columnNames,
            referencedTableName: fk.referencedTableName,
            referencedColumnNames: fk.referencedColumnNames,
          }),
      ),
    });
  }
}

function createMockQueryRunner(store: ContentSchemaStore): QueryRunner {
  const manager = {
    createQueryBuilder: () => ({
      update: () => ({
        set: () => ({
          where: () => ({
            execute: async () => {
              store.clearedCurrentVersionIds = true;
            },
          }),
        }),
      }),
    }),
  };

  return {
    manager,
    async createTable(table: Table) {
      const meta: TableMeta = {
        columns: new Map(),
        indices: [],
        foreignKeys: [],
      };
      for (const col of table.columns) {
        meta.columns.set(col.name, { name: col.name, type: String(col.type) });
      }
      for (const idx of table.indices ?? []) {
        meta.indices.push({
          name: idx.name!,
          columnNames: idx.columnNames,
          isUnique: !!idx.isUnique,
        });
      }
      for (const fk of table.foreignKeys ?? []) {
        meta.foreignKeys.push({
          name: fk.name!,
          columnNames: fk.columnNames,
          referencedTableName: fk.referencedTableName,
          referencedColumnNames: fk.referencedColumnNames,
        });
      }
      store.tables.set(table.name, meta);
    },
    async dropTable(name: string) {
      store.tables.delete(name);
    },
    async getTable(name: string) {
      if (!store.tables.has(name)) return undefined;
      return store.toTypeOrmTable(name);
    },
    async changeColumn(tableName: string, _old: string, column: TableColumn) {
      const table = store.ensureTable(tableName);
      table.columns.set(column.name, { name: column.name, type: String(column.type) });
    },
    async createIndex(tableName: string, index: TableIndex) {
      const table = store.ensureTable(tableName);
      table.indices.push({
        name: index.name!,
        columnNames: index.columnNames,
        isUnique: !!index.isUnique,
      });
    },
    async dropIndex(tableName: string, index: TableIndex | string) {
      const table = store.tables.get(tableName);
      if (!table) return;
      const name = typeof index === 'string' ? index : index.name!;
      table.indices = table.indices.filter((idx) => idx.name !== name);
    },
    async createForeignKey(tableName: string, fk: TableForeignKey) {
      const table = store.ensureTable(tableName);
      table.foreignKeys.push({
        name: fk.name!,
        columnNames: fk.columnNames,
        referencedTableName: fk.referencedTableName,
        referencedColumnNames: fk.referencedColumnNames,
      });
    },
    async dropForeignKey(tableName: string, fk: TableForeignKey | string) {
      const table = store.tables.get(tableName);
      if (!table) return;
      const name = typeof fk === 'string' ? fk : fk.name!;
      table.foreignKeys = table.foreignKeys.filter((item) => item.name !== name);
    },
  } as unknown as QueryRunner;
}

function hasAlterOwnedIndex(store: ContentSchemaStore): boolean {
  return (
    store.tables.get('content_version')?.indices.some((i) => i.name === ALTER_OWNED_INDEX) ?? false
  );
}

function hasAlterOwnedFk(store: ContentSchemaStore): boolean {
  return (
    store.tables.get('content_item')?.foreignKeys.some((fk) => fk.name === ALTER_OWNED_FK) ?? false
  );
}

function columnType(store: ContentSchemaStore, table: string, column: string): string | undefined {
  return store.tables.get(table)?.columns.get(column)?.type;
}

describe('CreateContentTables1749859200000 — ownership (behavior)', () => {
  const store = new ContentSchemaStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.reset();
    qr = createMockQueryRunner(store);
  });

  it('up() 创建 content 表但不创建 Alter 拥有的唯一索引和外键', async () => {
    await createMigration.up(qr);

    expect(store.tables.has('content_category')).toBe(true);
    expect(store.tables.has('content_item')).toBe(true);
    expect(store.tables.has('content_version')).toBe(true);
    expect(store.tables.has('content_relation')).toBe(true);

    expect(columnType(store, 'content_item', 'is_top')).toBe('smallint');
    expect(columnType(store, 'content_item', 'is_recommend')).toBe('smallint');
    expect(hasAlterOwnedIndex(store)).toBe(false);
    expect(hasAlterOwnedFk(store)).toBe(false);
  });
});

describe('AlterContentTablesIntegrity1749873600000 — behavior', () => {
  const store = new ContentSchemaStore();
  let qr: QueryRunner;

  beforeEach(() => {
    store.seedPostCreateTables();
    qr = createMockQueryRunner(store);
  });

  it('up() 在 Create 基线上创建唯一索引和外键，并保持 smallint', async () => {
    await alterMigration.up(qr);

    expect(columnType(store, 'content_item', 'is_top')).toBe('smallint');
    expect(columnType(store, 'content_item', 'is_recommend')).toBe('smallint');
    expect(hasAlterOwnedIndex(store)).toBe(true);
    expect(hasAlterOwnedFk(store)).toBe(true);
    expect(store.clearedCurrentVersionIds).toBe(true);
  });

  it('up() 将遗留 tinyint 统一为 smallint 并创建约束', async () => {
    store.seedLegacyTinyint();
    qr = createMockQueryRunner(store);

    await alterMigration.up(qr);

    expect(columnType(store, 'content_item', 'is_top')).toBe('smallint');
    expect(columnType(store, 'content_item', 'is_recommend')).toBe('smallint');
    expect(hasAlterOwnedIndex(store)).toBe(true);
    expect(hasAlterOwnedFk(store)).toBe(true);
  });

  it('down() 仅删除本迁移创建的索引和外键，保留 smallint', async () => {
    await alterMigration.up(qr);
    await alterMigration.down(qr);

    expect(hasAlterOwnedIndex(store)).toBe(false);
    expect(hasAlterOwnedFk(store)).toBe(false);
    expect(columnType(store, 'content_item', 'is_top')).toBe('smallint');
    expect(columnType(store, 'content_item', 'is_recommend')).toBe('smallint');
  });

  it('down() 在约束已不存在时安全跳过', async () => {
    await expect(alterMigration.down(qr)).resolves.not.toThrow();
    expect(columnType(store, 'content_item', 'is_top')).toBe('smallint');
  });

  it('up/down/up 周期后约束可恢复', async () => {
    await alterMigration.up(qr);
    await alterMigration.down(qr);
    await alterMigration.up(qr);

    expect(hasAlterOwnedIndex(store)).toBe(true);
    expect(hasAlterOwnedFk(store)).toBe(true);
    expect(columnType(store, 'content_item', 'is_top')).toBe('smallint');
  });
});

describe('AlterContentTablesIntegrity1749873600000 — down() HighGo rollback safety', () => {
  let alterSource: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749873600000-AlterContentTablesIntegrity.ts',
    );
    alterSource = fs.readFileSync(migrationPath, 'utf8');
  });

  it('down() 源码不包含 tinyint 回退', () => {
    const downBlock = alterSource.slice(alterSource.indexOf('async down('));
    expect(downBlock).not.toMatch(/type:\s*['"]tinyint['"]/);
    expect(downBlock).not.toContain('changeColumn');
  });

  it('down() 删除索引和外键前检查存在性', () => {
    expect(alterSource).toContain('if (versionFk)');
    expect(alterSource).toContain('if (versionUnique)');
  });
});
