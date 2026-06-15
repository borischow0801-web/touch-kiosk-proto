import 'reflect-metadata';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { EntityMetadataBuilder } from 'typeorm/metadata-builder/EntityMetadataBuilder';
import { buildDataSourceOptions, DB_ENTITIES } from '../src/database/database-config.factory';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { GuideDeptMapping } from '../src/database/entities/guide-dept-mapping.entity';
import { GuideApiCache } from '../src/database/entities/guide-api-cache.entity';
import { GuideItemConfig } from '../src/database/entities/guide-item-config.entity';
import { GuideThemeMapping } from '../src/database/entities/guide-theme-mapping.entity';

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
  it('builds PostgreSQL/HighGo entity metadata for all 14 entities without connection', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        expect(metadatas).toHaveLength(14);
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

  it('guide mapping entities use smallint for is_visible and text for platform_param_json', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        const deptMeta = metadatas.find((m) => m.target === GuideDeptMapping);
        const themeMeta = metadatas.find((m) => m.target === GuideThemeMapping);
        expect(deptMeta).toBeDefined();
        expect(themeMeta).toBeDefined();

        const deptVisible = deptMeta!.columns.find((c) => c.databaseName === 'is_visible');
        const themeVisible = themeMeta!.columns.find((c) => c.databaseName === 'is_visible');
        const platformJson = themeMeta!.columns.find((c) => c.databaseName === 'platform_param_json');
        const deptId = deptMeta!.columns.find((c) => c.databaseName === 'id');
        const deptDeletedAt = deptMeta!.columns.find((c) => c.databaseName === 'deleted_at');

        expect(String(deptVisible!.type)).toBe('smallint');
        expect(String(themeVisible!.type)).toBe('smallint');
        expect(String(platformJson!.type)).toBe('text');
        expect(deptId!.isGenerated).toBe(false);
        expect(deptDeletedAt).toBeDefined();

        const deptCodeIndex = deptMeta!.indices.find((i) => i.name === 'uk_guide_dept_mapping_dept_code');
        const themeCodeIndex = themeMeta!.indices.find((i) => i.name === 'uk_guide_theme_mapping_theme_code');
        expect(deptCodeIndex?.isUnique).toBe(true);
        expect(themeCodeIndex?.isUnique).toBe(true);
      },
    );
  });

  it('guide_item_config uses smallint flags, text for related ids, and unique platform_item_id', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        const itemMeta = metadatas.find((m) => m.target === GuideItemConfig);
        expect(itemMeta).toBeDefined();

        const isHot = itemMeta!.columns.find((c) => c.databaseName === 'is_hot');
        const isRecommend = itemMeta!.columns.find((c) => c.databaseName === 'is_recommend');
        const isVisible = itemMeta!.columns.find((c) => c.databaseName === 'is_visible');
        const relatedPolicy = itemMeta!.columns.find((c) => c.databaseName === 'related_policy_ids');
        const relatedFaq = itemMeta!.columns.find((c) => c.databaseName === 'related_faq_ids');
        const deletedAt = itemMeta!.columns.find((c) => c.databaseName === 'deleted_at');

        expect(String(isHot!.type)).toBe('smallint');
        expect(String(isRecommend!.type)).toBe('smallint');
        expect(String(isVisible!.type)).toBe('smallint');
        expect(String(relatedPolicy!.type)).toBe('text');
        expect(String(relatedFaq!.type)).toBe('text');
        expect(deletedAt).toBeDefined();

        const platformIndex = itemMeta!.indices.find(
          (i) => i.name === 'uk_guide_item_config_platform_item_id',
        );
        expect(platformIndex?.isUnique).toBe(true);
      },
    );
  });

  it('guide_api_cache uses text for request_param and response_body without deleted_at', () => {
    withEnv(
      {
        DB_DIALECT: 'highgo',
        DB_NAME: 'highgo_metadata_test',
        DB_USER: 'test',
        DB_PASS: 'test',
      },
      () => {
        const metadatas = buildHighGoEntityMetadatas();
        const cacheMeta = metadatas.find((m) => m.target === GuideApiCache);
        expect(cacheMeta).toBeDefined();

        const requestParam = cacheMeta!.columns.find((c) => c.databaseName === 'request_param');
        const responseBody = cacheMeta!.columns.find((c) => c.databaseName === 'response_body');
        const deletedAt = cacheMeta!.columns.find((c) => c.databaseName === 'deleted_at');

        expect(String(requestParam!.type)).toBe('text');
        expect(String(responseBody!.type)).toBe('text');
        expect(deletedAt).toBeUndefined();

        const cacheKeyIndex = cacheMeta!.indices.find((i) => i.name === 'uk_guide_api_cache_cache_key');
        expect(cacheKeyIndex?.isUnique).toBe(true);
      },
    );
  });
});
