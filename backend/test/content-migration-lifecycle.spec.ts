import 'reflect-metadata';
import 'dotenv/config';
import { execSync } from 'child_process';
import * as path from 'path';
import { DataSource } from 'typeorm';
import {
  assertMysqlDedicatedTestDatabase,
  assertMysqlTestDatabaseOwnership,
  buildMysqlTestDataSourceOptions,
  mysqlTestCliEnvironment,
} from './helpers/mysql-test-env';
import { isMigrationApplied } from './helpers/project-schema-reset';

const RUN_MYSQL_MIGRATION_LIFECYCLE = process.env.RUN_MYSQL_MIGRATION_LIFECYCLE === 'true';
const describeLifecycle = RUN_MYSQL_MIGRATION_LIFECYCLE ? describe : describe.skip;

const ALTER_MIGRATION = 'AlterContentTablesIntegrity1749873600000';
const ALTER_INDEX = 'uk_content_version_content_version_no';
const ALTER_FK = 'fk_content_item_current_version_id';

function migrationCli(env: NodeJS.ProcessEnv, command: 'migration:run' | 'migration:revert' | 'migration:show'): string {
  const backendDir = path.resolve(__dirname, '..');
  return execSync(`npm run ${command}`, {
    cwd: backendDir,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function getColumnType(
  dataSource: DataSource,
  table: string,
  column: string,
): Promise<string | null> {
  const db = assertMysqlDedicatedTestDatabase().testDb;
  const rows = await dataSource.query(
    `SELECT DATA_TYPE AS dataType FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column],
  );
  return rows[0]?.dataType ?? null;
}

async function hasNamedIndex(
  dataSource: DataSource,
  table: string,
  indexName: string,
): Promise<boolean> {
  const db = assertMysqlDedicatedTestDatabase().testDb;
  const rows = await dataSource.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [db, table, indexName],
  );
  return rows.length > 0;
}

async function hasNamedFk(
  dataSource: DataSource,
  table: string,
  constraintName: string,
): Promise<boolean> {
  const db = assertMysqlDedicatedTestDatabase().testDb;
  const rows = await dataSource.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
    [db, table, constraintName],
  );
  return rows.length > 0;
}

if (!RUN_MYSQL_MIGRATION_LIFECYCLE) {
  // eslint-disable-next-line no-console
  console.warn(
    'Migration lifecycle tests skipped. Enable RUN_MYSQL_MIGRATION_LIFECYCLE with the dedicated MYSQL_TEST_* settings.',
  );
}

describeLifecycle('Content migrations — MySQL Alter run/revert/run lifecycle', () => {
  let dataSource: DataSource;
  const cliEnv = (): NodeJS.ProcessEnv => mysqlTestCliEnvironment();

  beforeAll(async () => {
    assertMysqlDedicatedTestDatabase();
    dataSource = new DataSource(buildMysqlTestDataSourceOptions());
    await dataSource.initialize();
    await assertMysqlTestDatabaseOwnership(dataSource);

    const pending = await dataSource.showMigrations();
    if (pending) {
      await dataSource.runMigrations();
    }
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    const pending = await dataSource.showMigrations();
    if (pending) {
      await dataSource.runMigrations();
    }
    await dataSource.destroy();
  });

  async function revertUntilAlterUndone(): Promise<void> {
    let guard = 0;
    while (await isMigrationApplied(dataSource, ALTER_MIGRATION)) {
      migrationCli(cliEnv(), 'migration:revert');
      guard += 1;
      if (guard > 10) {
        throw new Error('revertUntilAlterUndone exceeded safety limit');
      }
    }
  }

  it('回滚 Alter 后结构与 CreateContentTables 基线一致（smallint 保留、无 Alter 约束）', async () => {
    await revertUntilAlterUndone();

    expect(await getColumnType(dataSource, 'content_item', 'is_top')).toBe('smallint');
    expect(await getColumnType(dataSource, 'content_item', 'is_recommend')).toBe('smallint');
    expect(await hasNamedIndex(dataSource, 'content_version', ALTER_INDEX)).toBe(false);
    expect(await hasNamedFk(dataSource, 'content_item', ALTER_FK)).toBe(false);
    expect(await isMigrationApplied(dataSource, ALTER_MIGRATION)).toBe(false);
  });

  it('再次 migration:run 恢复 Alter 约束且列仍为 smallint', async () => {
    const runOut = migrationCli(cliEnv(), 'migration:run');
    expect(runOut).toContain(ALTER_MIGRATION);

    expect(await getColumnType(dataSource, 'content_item', 'is_top')).toBe('smallint');
    expect(await getColumnType(dataSource, 'content_item', 'is_recommend')).toBe('smallint');
    expect(await hasNamedIndex(dataSource, 'content_version', ALTER_INDEX)).toBe(true);
    expect(await hasNamedFk(dataSource, 'content_item', ALTER_FK)).toBe(true);
    expect(await isMigrationApplied(dataSource, ALTER_MIGRATION)).toBe(true);

    const showAfterRun = migrationCli(cliEnv(), 'migration:show');
    expect(showAfterRun).toMatch(/\[X\].*AlterContentTablesIntegrity1749873600000/);
  });

  it('版本唯一约束实际拒绝重复 version_no', async () => {
    const suffix = Date.now();
    const itemId = `lifecycle-item-${suffix}`;
    const versionId1 = `lifecycle-ver1-${suffix}`;
    const versionId2 = `lifecycle-ver2-${suffix}`;

    await dataSource.query(
      `INSERT INTO content_item (id, content_type, title, status, is_top, is_recommend, sort_order, created_at, updated_at)
       VALUES (?, 'policy_file', ?, 'draft', 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [itemId, `lifecycle_${suffix}`],
    );
    await dataSource.query(
      `INSERT INTO content_version (id, content_id, version_no, title, status, created_at)
       VALUES (?, ?, 1, ?, 'draft', CURRENT_TIMESTAMP)`,
      [versionId1, itemId, `lifecycle_${suffix}`],
    );

    await expect(
      dataSource.query(
        `INSERT INTO content_version (id, content_id, version_no, title, status, created_at)
         VALUES (?, ?, 1, 'dup', 'draft', CURRENT_TIMESTAMP)`,
        [versionId2, itemId],
      ),
    ).rejects.toThrow();

    await dataSource.query(`DELETE FROM content_version WHERE content_id = ?`, [itemId]);
    await dataSource.query(`DELETE FROM content_item WHERE id = ?`, [itemId]);
  });

  it('current_version_id 外键拒绝引用不存在的版本', async () => {
    const suffix = Date.now();
    const itemId = `lifecycle-fk-${suffix}`;
    const missingVersionId = `00000000-0000-0000-0000-${String(suffix).padStart(12, '0')}`;

    await expect(
      dataSource.query(
        `INSERT INTO content_item (id, content_type, title, status, is_top, is_recommend, sort_order, current_version_id, created_at, updated_at)
         VALUES (?, 'policy_file', ?, 'draft', 0, 0, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [itemId, `fk_${suffix}`, missingVersionId],
      ),
    ).rejects.toThrow();
  });
});
