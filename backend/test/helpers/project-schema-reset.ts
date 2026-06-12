import { DataSource, QueryRunner } from 'typeorm';
import { assertMysqlTestDatabaseOwnership } from './mysql-test-env';

/** Project-owned tables in FK-safe drop order (children first). */
export const PROJECT_TABLES_DROP_ORDER = [
  'publish_record',
  'content_relation',
  'content_item',
  'content_version',
  'content_category',
  'sys_role_permission',
  'sys_user_role',
  'sys_permission',
  'sys_role',
  'sys_user',
  'migrations',
];

export async function resetProjectSchema(dataSource: DataSource): Promise<void> {
  await assertMysqlTestDatabaseOwnership(dataSource);
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of PROJECT_TABLES_DROP_ORDER) {
      const exists: { cnt: number }[] = await queryRunner.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table],
      );
      if (Number(exists[0]?.cnt ?? 0) === 0) continue;
      await queryRunner.dropTable(table, true, true, true);
    }
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await queryRunner.release();
  }
}

export async function isMigrationApplied(
  dataSource: DataSource,
  name: string,
): Promise<boolean> {
  const rows: { cnt: number }[] = await dataSource.query(
    `SELECT COUNT(*) AS cnt FROM migrations WHERE name = ?`,
    [name],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}
