import 'reflect-metadata';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { EntityMetadataBuilder } from 'typeorm/metadata-builder/EntityMetadataBuilder';
import { buildDataSourceOptions, DB_ENTITIES } from '../src/database/database-config.factory';
import { ContentItem } from '../src/database/entities/content-item.entity';

const FORBIDDEN_COLUMN_TYPES = new Set(['tinyint', 'enum', 'json', 'jsonb']);

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
  const saved = { ...process.env };
  try {
    ['DB_DIALECT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA'].forEach(
      (k) => delete process.env[k],
    );
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
    fn();
  } finally {
    ['DB_DIALECT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_SCHEMA'].forEach(
      (k) => delete process.env[k],
    );
    Object.assign(process.env, saved);
  }
}

function buildHighGoEntityMetadatas() {
  const ds = new DataSource({
    ...buildDataSourceOptions(),
    entities: DB_ENTITIES,
  });
  const builder = new EntityMetadataBuilder(ds, getMetadataArgsStorage());
  return builder.build();
}

describe('HighGo entity metadata compatibility', () => {
  it('builds PostgreSQL/HighGo entity metadata for all 10 entities without connection', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        expect(metadatas).toHaveLength(10);
      },
    );
  });

  it('entity columns do not use tinyint, enum, or JSON types', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        const violations: string[] = [];

        for (const meta of metadatas) {
          for (const col of meta.columns) {
            const rawType = col.type;
            const normalized =
              typeof rawType === 'function'
                ? rawType.name.toLowerCase()
                : String(rawType).toLowerCase();
            if (FORBIDDEN_COLUMN_TYPES.has(normalized)) {
              violations.push(`${meta.tableName}.${col.databaseName}: ${normalized}`);
            }
          }
        }

        expect(violations).toEqual([]);
      },
    );
  });

  it('content_item boolean flags use smallint not tinyint', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        const itemMeta = metadatas.find((m) => m.target === ContentItem);
        expect(itemMeta).toBeDefined();

        const isTop = itemMeta!.columns.find((c) => c.databaseName === 'is_top');
        const isRecommend = itemMeta!.columns.find((c) => c.databaseName === 'is_recommend');
        expect(String(isTop!.type)).toBe('smallint');
        expect(String(isRecommend!.type)).toBe('smallint');
      },
    );
  });
});
