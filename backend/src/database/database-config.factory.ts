import { DataSourceOptions } from 'typeorm';
import { SysUser } from './entities/sys-user.entity';
import { SysRole } from './entities/sys-role.entity';
import { SysUserRole } from './entities/sys-user-role.entity';
import { SysPermission } from './entities/sys-permission.entity';
import { SysRolePermission } from './entities/sys-role-permission.entity';
import { ContentCategory } from './entities/content-category.entity';
import { ContentItem } from './entities/content-item.entity';
import { ContentVersion } from './entities/content-version.entity';
import { ContentRelation } from './entities/content-relation.entity';
import { PublishRecord } from './entities/publish-record.entity';
import { GuideDeptMapping } from './entities/guide-dept-mapping.entity';
import { GuideThemeMapping } from './entities/guide-theme-mapping.entity';
import { GuideItemConfig } from './entities/guide-item-config.entity';
import { GuideApiCache } from './entities/guide-api-cache.entity';
import { HomeConfig } from './entities/home-config.entity';
import { HomeConfigVersion } from './entities/home-config-version.entity';
import { HomeModule } from './entities/home-module.entity';
import { CreateRbacTables1749686400000 } from './migrations/1749686400000-CreateRbacTables';
import { SeedRbacData1749772800000 } from './migrations/1749772800000-SeedRbacData';
import { CreateContentTables1749859200000 } from './migrations/1749859200000-CreateContentTables';
import { SeedContentPermissions1749862800000 } from './migrations/1749862800000-SeedContentPermissions';
import { AlterContentTablesIntegrity1749873600000 } from './migrations/1749873600000-AlterContentTablesIntegrity';
import { CreatePublishRecordTable1749880800000 } from './migrations/1749880800000-CreatePublishRecordTable';
import { SeedPublishPermissions1749884400000 } from './migrations/1749884400000-SeedPublishPermissions';
import { CreateGuideMappingTables1749895200000 } from './migrations/1749895200000-CreateGuideMappingTables';
import { SeedGuidePermissions1749898800000 } from './migrations/1749898800000-SeedGuidePermissions';
import { SeedGuideRolePermissions1749902400000 } from './migrations/1749902400000-SeedGuideRolePermissions';
import { CreateGuideItemConfigTable1749910800000 } from './migrations/1749910800000-CreateGuideItemConfigTable';
import { SeedGuideItemPermissions1749914400000 } from './migrations/1749914400000-SeedGuideItemPermissions';
import { SeedGuideItemRolePermissions1749918000000 } from './migrations/1749918000000-SeedGuideItemRolePermissions';
import { CreateGuideApiCacheTable1749921600000 } from './migrations/1749921600000-CreateGuideApiCacheTable';
import { CreateHomeConfigTables1749925200000 } from './migrations/1749925200000-CreateHomeConfigTables';
import { SeedHomeConfigPermissions1749928800000 } from './migrations/1749928800000-SeedHomeConfigPermissions';
import { SeedHomeConfigRolePermissions1749932400000 } from './migrations/1749932400000-SeedHomeConfigRolePermissions';

export const DB_ENTITIES = [
  SysUser,
  SysRole,
  SysUserRole,
  SysPermission,
  SysRolePermission,
  ContentCategory,
  ContentItem,
  ContentVersion,
  ContentRelation,
  PublishRecord,
  GuideDeptMapping,
  GuideThemeMapping,
  GuideItemConfig,
  GuideApiCache,
  HomeConfig,
  HomeConfigVersion,
  HomeModule,
];
export const DB_MIGRATIONS = [
  CreateRbacTables1749686400000,
  SeedRbacData1749772800000,
  CreateContentTables1749859200000,
  SeedContentPermissions1749862800000,
  AlterContentTablesIntegrity1749873600000,
  CreatePublishRecordTable1749880800000,
  SeedPublishPermissions1749884400000,
  CreateGuideMappingTables1749895200000,
  SeedGuidePermissions1749898800000,
  SeedGuideRolePermissions1749902400000,
  CreateGuideItemConfigTable1749910800000,
  SeedGuideItemPermissions1749914400000,
  SeedGuideItemRolePermissions1749918000000,
  CreateGuideApiCacheTable1749921600000,
  CreateHomeConfigTables1749925200000,
  SeedHomeConfigPermissions1749928800000,
  SeedHomeConfigRolePermissions1749932400000,
];

/**
 * Builds TypeORM DataSourceOptions from environment variables.
 * Throws for unknown DB_DIALECT to prevent silent misconfiguration.
 *
 * Supported dialects:
 *   mysql   → TypeORM mysql driver  (development, MySQL 8)
 *   highgo  → TypeORM postgres driver (production, HighGo)
 */
export function buildDataSourceOptions(): DataSourceOptions {
  const dialect = (process.env.DB_DIALECT ?? 'mysql').toLowerCase();

  if (dialect !== 'mysql' && dialect !== 'highgo') {
    throw new Error(
      `Unknown DB_DIALECT: "${process.env.DB_DIALECT}". Supported values: mysql, highgo. ` +
        'Check your .env file.',
    );
  }

  const host = process.env.DB_HOST ?? 'localhost';
  const username = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const database = process.env.DB_NAME;
  const logging = process.env.NODE_ENV !== 'production';

  if (dialect === 'mysql') {
    return {
      type: 'mysql',
      host,
      port: Number(process.env.DB_PORT ?? 3306),
      username,
      password,
      database,
      entities: DB_ENTITIES,
      migrations: DB_MIGRATIONS,
      synchronize: false,
      migrationsRun: false,
      logging,
      connectTimeout: 10000,
      extra: { charset: 'utf8mb4_unicode_ci' },
    };
  }

  // highgo → PostgreSQL-compatible driver
  const sslEnabled = process.env.DB_SSL === 'true';
  // DB_SSL_INSECURE=true bypasses certificate verification for self-signed certs.
  // WARNING: only enable in non-production environments or with explicit DBA approval.
  const sslInsecure = process.env.DB_SSL_INSECURE === 'true';
  return {
    type: 'postgres',
    host,
    port: Number(process.env.DB_PORT ?? 5866),
    username,
    password,
    database,
    schema: process.env.DB_SCHEMA ?? 'public',
    ssl: sslEnabled ? { rejectUnauthorized: !sslInsecure } : false,
    entities: DB_ENTITIES,
    migrations: DB_MIGRATIONS,
    synchronize: false,
    migrationsRun: false,
    logging,
    extra: sslEnabled ? undefined : { connectionTimeoutMillis: 10000 },
  };
}
