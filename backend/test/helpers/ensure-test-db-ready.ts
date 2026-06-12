import { execSync } from 'child_process';
import * as path from 'path';
import { DataSource } from 'typeorm';
import {
  assertMysqlDedicatedTestDatabase,
  assertMysqlTestDatabaseOwnership,
  mysqlTestCliEnvironment,
} from './mysql-test-env';

const ALTER_INDEX = 'uk_content_version_content_version_no';
const ALTER_FK = 'fk_content_item_current_version_id';

async function hasNamedIndex(
  dataSource: DataSource,
  db: string,
  table: string,
  indexName: string,
): Promise<boolean> {
  const rows = await dataSource.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [db, table, indexName],
  );
  return rows.length > 0;
}

async function hasNamedFk(
  dataSource: DataSource,
  db: string,
  table: string,
  constraintName: string,
): Promise<boolean> {
  const rows = await dataSource.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY' LIMIT 1`,
    [db, table, constraintName],
  );
  return rows.length > 0;
}

/** Ensure dedicated test DB has pending migrations applied and Alter integrity constraints. */
export async function ensureDedicatedTestDatabaseReady(dataSource: DataSource): Promise<void> {
  const { testDb } = assertMysqlDedicatedTestDatabase();
  await assertMysqlTestDatabaseOwnership(dataSource);
  const pending = await dataSource.showMigrations();
  if (pending) {
    await dataSource.runMigrations();
  }

  const indexOk = await hasNamedIndex(dataSource, testDb, 'content_version', ALTER_INDEX);
  const fkOk = await hasNamedFk(dataSource, testDb, 'content_item', ALTER_FK);
  if (indexOk && fkOk) return;

  const backendDir = path.resolve(__dirname, '../..');
  execSync('npm run migration:run', {
    cwd: backendDir,
    env: { ...process.env, ...mysqlTestCliEnvironment() },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
