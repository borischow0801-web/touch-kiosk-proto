import * as fs from 'fs';
import * as path from 'path';

// Must import reflect-metadata before any entity/typeorm imports
import 'reflect-metadata';
import { buildDataSourceOptions, DB_ENTITIES, DB_MIGRATIONS } from '../src/database/database-config.factory';

// ── helpers ────────────────────────────────────────────────────────────────

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const saved = { ...process.env };
  try {
    // clear all relevant keys first
    ['DB_DIALECT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA', 'DB_SSL', 'DB_SSL_INSECURE', 'NODE_ENV'].forEach(
      k => delete process.env[k],
    );
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
    fn();
  } finally {
    // restore
    ['DB_DIALECT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA', 'DB_SSL', 'DB_SSL_INSECURE', 'NODE_ENV'].forEach(
      k => delete process.env[k],
    );
    Object.assign(process.env, saved);
  }
}

// ── Config factory tests ───────────────────────────────────────────────────

describe('buildDataSourceOptions — dialect mapping', () => {
  it('mysql dialect returns type mysql', () => {
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      const opts = buildDataSourceOptions();
      expect(opts.type).toBe('mysql');
    });
  });

  it('highgo dialect returns type postgres', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      const opts = buildDataSourceOptions();
      expect(opts.type).toBe('postgres');
    });
  });

  it('default dialect (no DB_DIALECT set) is mysql', () => {
    withEnv({}, () => {
      const opts = buildDataSourceOptions();
      expect(opts.type).toBe('mysql');
    });
  });

  it('unknown dialect throws with descriptive message', () => {
    withEnv({ DB_DIALECT: 'oracle' }, () => {
      expect(() => buildDataSourceOptions()).toThrow(/unknown db_dialect/i);
    });
  });

  it('another unknown dialect throws', () => {
    withEnv({ DB_DIALECT: 'mssql' }, () => {
      expect(() => buildDataSourceOptions()).toThrow(/unknown db_dialect/i);
    });
  });
});

describe('buildDataSourceOptions — common invariants', () => {
  it('mysql: synchronize is always false', () => {
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      expect(buildDataSourceOptions().synchronize).toBe(false);
    });
  });

  it('highgo: synchronize is always false', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      expect(buildDataSourceOptions().synchronize).toBe(false);
    });
  });

  it('mysql: migrationsRun is false', () => {
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      const opts = buildDataSourceOptions();
      expect((opts as { migrationsRun?: boolean }).migrationsRun).toBe(false);
    });
  });

  it('highgo: migrationsRun is false', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      const opts = buildDataSourceOptions();
      expect((opts as { migrationsRun?: boolean }).migrationsRun).toBe(false);
    });
  });
});

describe('buildDataSourceOptions — entity and migration consistency', () => {
  it('mysql discovers exactly 10 entities', () => {
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      const opts = buildDataSourceOptions();
      expect(opts.entities).toHaveLength(10);
    });
  });

  it('highgo discovers exactly 10 entities', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      const opts = buildDataSourceOptions();
      expect(opts.entities).toHaveLength(10);
    });
  });

  it('mysql and highgo share identical entity array', () => {
    let mysqlEntities: unknown;
    let hgEntities: unknown;
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      mysqlEntities = buildDataSourceOptions().entities;
    });
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      hgEntities = buildDataSourceOptions().entities;
    });
    expect(mysqlEntities).toEqual(hgEntities);
  });

  it('both dialects include exactly 7 migrations', () => {
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      expect(buildDataSourceOptions().migrations).toHaveLength(7);
    });
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      expect(buildDataSourceOptions().migrations).toHaveLength(7);
    });
  });

  it('both dialects share migrations in correct order', () => {
    let mysqlMigrations: { name: string }[];
    let hgMigrations: { name: string }[];
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      mysqlMigrations = buildDataSourceOptions().migrations as { name: string }[];
    });
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      hgMigrations = buildDataSourceOptions().migrations as { name: string }[];
    });
    expect(mysqlMigrations!.map((m) => m.name)).toEqual([
      'CreateRbacTables1749686400000',
      'SeedRbacData1749772800000',
      'CreateContentTables1749859200000',
      'SeedContentPermissions1749862800000',
      'AlterContentTablesIntegrity1749873600000',
      'CreatePublishRecordTable1749880800000',
      'SeedPublishPermissions1749884400000',
    ]);
    expect(hgMigrations!.map((m) => m.name)).toEqual(mysqlMigrations!.map((m) => m.name));
  });

  it('both dialects share same migration', () => {
    let mysqlMigrations: unknown;
    let hgMigrations: unknown;
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      mysqlMigrations = buildDataSourceOptions().migrations;
    });
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      hgMigrations = buildDataSourceOptions().migrations;
    });
    expect(mysqlMigrations).toEqual(hgMigrations);
  });

  it('DB_ENTITIES has exactly 10 items', () => {
    expect(DB_ENTITIES).toHaveLength(10);
  });

  it('DB_MIGRATIONS has exactly 7 items in correct order', () => {
    expect(DB_MIGRATIONS).toHaveLength(7);
    expect(DB_MIGRATIONS.map((m) => m.name)).toEqual([
      'CreateRbacTables1749686400000',
      'SeedRbacData1749772800000',
      'CreateContentTables1749859200000',
      'SeedContentPermissions1749862800000',
      'AlterContentTablesIntegrity1749873600000',
      'CreatePublishRecordTable1749880800000',
      'SeedPublishPermissions1749884400000',
    ]);
  });
});

describe('buildDataSourceOptions — mysql specific', () => {
  it('default port is 3306', () => {
    withEnv({ DB_DIALECT: 'mysql' }, () => {
      const opts = buildDataSourceOptions() as { port: number };
      expect(opts.port).toBe(3306);
    });
  });

  it('respects DB_PORT override', () => {
    withEnv({ DB_DIALECT: 'mysql', DB_PORT: '13306' }, () => {
      const opts = buildDataSourceOptions() as { port: number };
      expect(opts.port).toBe(13306);
    });
  });
});

describe('buildDataSourceOptions — highgo specific', () => {
  it('default port is 5866', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      const opts = buildDataSourceOptions() as { port: number };
      expect(opts.port).toBe(5866);
    });
  });

  it('respects DB_PORT override', () => {
    withEnv({ DB_DIALECT: 'highgo', DB_PORT: '5432' }, () => {
      const opts = buildDataSourceOptions() as { port: number };
      expect(opts.port).toBe(5432);
    });
  });

  it('respects DB_SCHEMA', () => {
    withEnv({ DB_DIALECT: 'highgo', DB_SCHEMA: 'kiosk' }, () => {
      const opts = buildDataSourceOptions() as { schema?: string };
      expect(opts.schema).toBe('kiosk');
    });
  });

  it('default schema is public', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      const opts = buildDataSourceOptions() as { schema?: string };
      expect(opts.schema).toBe('public');
    });
  });

  it('SSL disabled when DB_SSL is not set', () => {
    withEnv({ DB_DIALECT: 'highgo' }, () => {
      const opts = buildDataSourceOptions() as { ssl?: unknown };
      expect(opts.ssl).toBe(false);
    });
  });

  it('SSL enabled with cert verification by default (DB_SSL=true)', () => {
    withEnv({ DB_DIALECT: 'highgo', DB_SSL: 'true' }, () => {
      const opts = buildDataSourceOptions() as { ssl?: { rejectUnauthorized?: boolean } };
      expect(opts.ssl).toBeTruthy();
      expect(typeof opts.ssl).toBe('object');
      expect((opts.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized).toBe(true);
    });
  });

  it('SSL with insecure mode disables cert verification (DB_SSL=true, DB_SSL_INSECURE=true)', () => {
    withEnv({ DB_DIALECT: 'highgo', DB_SSL: 'true', DB_SSL_INSECURE: 'true' }, () => {
      const opts = buildDataSourceOptions() as { ssl?: { rejectUnauthorized?: boolean } };
      expect(opts.ssl).toBeTruthy();
      expect((opts.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized).toBe(false);
    });
  });
});

// ── Migration static scan ──────────────────────────────────────────────────

describe('Migration 1749686400000-CreateRbacTables — dialect-neutral DDL', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749686400000-CreateRbacTables.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('does not use raw queryRunner.query', () => {
    expect(content).not.toContain('queryRunner.query(');
  });

  it('does not contain ENGINE=', () => {
    expect(content).not.toMatch(/ENGINE\s*=/i);
  });

  it('does not contain CHARSET=', () => {
    expect(content).not.toMatch(/CHARSET\s*=/i);
  });

  it('does not contain COLLATE', () => {
    expect(content).not.toMatch(/COLLATE/i);
  });

  it('does not contain backtick identifiers', () => {
    expect(content).not.toContain('`');
  });

  it('does not contain UNIQUE KEY (MySQL DDL)', () => {
    expect(content).not.toMatch(/UNIQUE\s+KEY/i);
  });

  it('does not contain standalone KEY (MySQL index shorthand)', () => {
    // Matches "KEY idx_name" as standalone DDL keyword
    expect(content).not.toMatch(/\bKEY\s+[a-zA-Z_`"]/);
  });

  it('does not use CREATE TABLE IF NOT EXISTS', () => {
    expect(content).not.toMatch(/IF\s+NOT\s+EXISTS/i);
  });

  it('uses TypeORM Table API (createTable)', () => {
    expect(content).toContain('createTable');
  });

  it('uses TableIndex', () => {
    expect(content).toContain('TableIndex');
  });

  it('uses TableForeignKey', () => {
    expect(content).toContain('TableForeignKey');
  });
});

describe('Migration 1749686400000-CreateRbacTables — foreign keys', () => {
  let content: string;

  beforeAll(() => {
    const migrationPath = path.resolve(
      __dirname,
      '../src/database/migrations/1749686400000-CreateRbacTables.ts',
    );
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('contains fk_sys_user_role_user_id', () => {
    expect(content).toContain('fk_sys_user_role_user_id');
  });

  it('contains fk_sys_user_role_role_id', () => {
    expect(content).toContain('fk_sys_user_role_role_id');
  });

  it('contains fk_sys_role_permission_role_id', () => {
    expect(content).toContain('fk_sys_role_permission_role_id');
  });

  it('contains fk_sys_role_permission_permission_id', () => {
    expect(content).toContain('fk_sys_role_permission_permission_id');
  });

  it('uses NO ACTION for onDelete (no cascade physical delete)', () => {
    expect(content).toContain('NO ACTION');
  });
});
