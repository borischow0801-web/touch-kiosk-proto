import { DataSource, DataSourceOptions } from 'typeorm';
import { buildDataSourceOptions } from '../../src/database/database-config.factory';

export const PROJECT_TEST_DATABASE = 'touch_kiosk_test';
export const PROJECT_TEST_USER = 'touch_kiosk_test_user';
export const PROJECT_TEST_MARKER = 'touch-kiosk-system';

export interface MysqlTestEnvironment {
  testDb: string;
  testUser: string;
  testPassword: string;
  testHost: string;
  testPort: number;
}

export function assertMysqlDedicatedTestDatabase(): MysqlTestEnvironment {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('MySQL dedicated tests must not run when NODE_ENV=production');
  }
  const dialect = (process.env.DB_DIALECT ?? 'mysql').toLowerCase();
  if (dialect !== 'mysql') {
    throw new Error(`MySQL dedicated tests require DB_DIALECT=mysql, got "${dialect}"`);
  }

  const testDb = process.env.MYSQL_TEST_DATABASE?.trim();
  const testUser = process.env.MYSQL_TEST_USER?.trim();
  const testPassword = process.env.MYSQL_TEST_PASS;
  const testHost = process.env.MYSQL_TEST_HOST?.trim() || '127.0.0.1';
  const testPort = Number(process.env.MYSQL_TEST_PORT ?? 3306);

  if (testDb !== PROJECT_TEST_DATABASE) {
    throw new Error(`MYSQL_TEST_DATABASE must equal "${PROJECT_TEST_DATABASE}"`);
  }
  if (testUser !== PROJECT_TEST_USER) {
    throw new Error(`MYSQL_TEST_USER must equal "${PROJECT_TEST_USER}"`);
  }
  if (!testPassword) {
    throw new Error('MYSQL_TEST_PASS must be set explicitly');
  }
  if (!Number.isInteger(testPort) || testPort <= 0) {
    throw new Error('MYSQL_TEST_PORT must be a valid positive integer');
  }

  const devDb = process.env.DB_NAME?.trim();
  if (devDb && testDb === devDb) {
    throw new Error('MYSQL_TEST_DATABASE must not equal DB_NAME');
  }

  const expectedConfirmation = `${PROJECT_TEST_DATABASE}:${PROJECT_TEST_USER}`;
  if (process.env.MYSQL_TEST_CONFIRM !== expectedConfirmation) {
    throw new Error(`MYSQL_TEST_CONFIRM must equal "${expectedConfirmation}"`);
  }

  return { testDb, testUser, testPassword, testHost, testPort };
}

export function buildMysqlTestDataSourceOptions(
  overrides: Partial<DataSourceOptions> = {},
): DataSourceOptions {
  const base = buildDataSourceOptions();
  if (base.type !== 'mysql') {
    throw new Error('Dedicated MySQL tests require mysql DataSourceOptions');
  }
  const env = assertMysqlDedicatedTestDatabase();
  return {
    ...base,
    host: env.testHost,
    port: env.testPort,
    username: env.testUser,
    password: env.testPassword,
    database: env.testDb,
    logging: false,
    ...overrides,
  } as DataSourceOptions;
}

export function mysqlTestCliEnvironment(): NodeJS.ProcessEnv {
  const env = assertMysqlDedicatedTestDatabase();
  return {
    DB_DIALECT: 'mysql',
    DB_HOST: env.testHost,
    DB_PORT: String(env.testPort),
    DB_USER: env.testUser,
    DB_PASS: env.testPassword,
    DB_NAME: env.testDb,
  };
}

export async function assertMysqlTestDatabaseOwnership(dataSource: DataSource): Promise<void> {
  const rows: { project_code: string }[] = await dataSource.query(
    'SELECT project_code FROM touch_kiosk_test_guard LIMIT 1',
  );
  if (rows[0]?.project_code !== PROJECT_TEST_MARKER) {
    throw new Error('Dedicated test database ownership marker is missing or invalid');
  }
}
