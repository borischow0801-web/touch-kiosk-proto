import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { DB_MIGRATIONS } from '../src/database/database-config.factory';
import {
  assertMysqlDedicatedTestDatabase,
  assertMysqlTestDatabaseOwnership,
  buildMysqlTestDataSourceOptions,
} from './helpers/mysql-test-env';
import { resetProjectSchema } from './helpers/project-schema-reset';

const RUN_MYSQL_MIGRATION_FRESH_INSTALL = process.env.RUN_MYSQL_MIGRATION_FRESH_INSTALL === 'true';
const describeFreshInstall = RUN_MYSQL_MIGRATION_FRESH_INSTALL ? describe : describe.skip;

const EXPECTED_MIGRATION_COUNT = 14;
const CONTENT_TABLES = [
  'content_category',
  'content_item',
  'content_version',
  'content_relation',
];
const ALTER_INDEX = 'uk_content_version_content_version_no';
const ALTER_FK = 'fk_content_item_current_version_id';

const PROJECT_TABLES_FROM_MIGRATIONS = [
  'migrations',
  'sys_user',
  'sys_role',
  'sys_permission',
  'sys_user_role',
  'sys_role_permission',
  'content_category',
  'content_item',
  'content_version',
  'content_relation',
  'publish_record',
  'guide_dept_mapping',
  'guide_theme_mapping',
  'guide_item_config',
  'guide_api_cache',
];

if (!RUN_MYSQL_MIGRATION_FRESH_INSTALL) {
  // eslint-disable-next-line no-console
  console.warn(
    'Fresh install migration test skipped. Enable RUN_MYSQL_MIGRATION_FRESH_INSTALL with the dedicated MYSQL_TEST_* settings.',
  );
}

describeFreshInstall('MySQL — fresh project schema full migration install', () => {
  let dataSource: DataSource;
  let testDb: string;

  beforeAll(async () => {
    ({ testDb } = assertMysqlDedicatedTestDatabase());
    dataSource = new DataSource(buildMysqlTestDataSourceOptions({ migrationsRun: false }));
    await dataSource.initialize();
    await assertMysqlTestDatabaseOwnership(dataSource);
  });

  afterAll(async () => {
    if (!dataSource?.isInitialized) return;
    await resetProjectSchema(dataSource);
    await dataSource.runMigrations();
    await dataSource.destroy();
  });

  it('从空项目 schema 执行全部 14 条迁移并验证结构', async () => {
    await resetProjectSchema(dataSource);

    const tableCount: { cnt: number }[] = await dataSource.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testDb,
        ...PROJECT_TABLES_FROM_MIGRATIONS,
      ],
    );
    expect(Number(tableCount[0].cnt)).toBe(0);

    await dataSource.runMigrations();

    const migrationRows: { name: string }[] = await dataSource.query(
      `SELECT name FROM migrations ORDER BY id ASC`,
    );
    expect(migrationRows).toHaveLength(EXPECTED_MIGRATION_COUNT);
    expect(migrationRows.map((r) => r.name)).toEqual(DB_MIGRATIONS.map((m) => m.name));

    for (const table of CONTENT_TABLES) {
      const exists: { cnt: number }[] = await dataSource.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [testDb, table],
      );
      expect(Number(exists[0].cnt)).toBe(1);
    }

    const publishExists: { cnt: number }[] = await dataSource.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'publish_record'`,
      [testDb],
    );
    expect(Number(publishExists[0].cnt)).toBe(1);

    for (const table of ['guide_dept_mapping', 'guide_theme_mapping']) {
      const exists: { cnt: number }[] = await dataSource.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [testDb, table],
      );
      expect(Number(exists[0].cnt)).toBe(1);
    }

    const isTopType: { dataType: string }[] = await dataSource.query(
      `SELECT DATA_TYPE AS dataType FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'content_item' AND COLUMN_NAME = 'is_top'`,
      [testDb],
    );
    expect(isTopType[0].dataType).toBe('smallint');

    const uniqueIdx: { cnt: number }[] = await dataSource.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'content_version' AND INDEX_NAME = ?`,
      [testDb, ALTER_INDEX],
    );
    expect(Number(uniqueIdx[0].cnt)).toBeGreaterThan(0);

    const fk: { cnt: number }[] = await dataSource.query(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'content_item' AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [testDb, ALTER_FK],
    );
    expect(Number(fk[0].cnt)).toBe(1);
  });
});
