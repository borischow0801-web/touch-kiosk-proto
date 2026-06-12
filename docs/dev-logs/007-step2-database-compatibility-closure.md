# 007 · Step 2 数据库兼容性闭环

> 修复 Step 2 遗留的 5 项数据库兼容性问题：统一配置工厂、安装 pg 驱动、
> 跨方言迁移重写、外键约束补全、HighGo 适配就绪。

---

## 修改和新增文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `backend/src/database/database-config.factory.ts` | 新建 | 统一配置工厂，支持 mysql / highgo 两个方言 |
| `backend/src/database/database.module.ts` | 修改 | 改用工厂，NestJS 追加 retryAttempts/retryDelay |
| `backend/src/database/data-source.ts` | 修改 | 改用工厂，CLI DataSource 与 NestJS 模块共享同一配置逻辑 |
| `backend/src/database/migrations/1749686400000-CreateRbacTables.ts` | 重写 | 用 TypeORM Schema API 替代原始 SQL；含 4 个外键约束 |
| `backend/.env.example` | 修改 | 补充 DB_DIALECT 说明、MySQL 开发段和 HighGo 生产段配置示例 |
| `backend/test/database-config.spec.ts` | 新建 | 40 个自动化测试：工厂配置、迁移静态扫描、外键验证 |
| `backend/package.json` | 修改 | 新增 `pg@^8.21.0`（生产依赖，实装 8.21.0）、`@types/pg@^8.20.0`（开发依赖） |

---

## 配置分支说明

### 工厂入口

`backend/src/database/database-config.factory.ts` → `buildDataSourceOptions()`

| 环境变量 | 值 | 行为 |
|---|---|---|
| `DB_DIALECT` | `mysql`（默认）| 返回 TypeORM `mysql` 驱动 DataSourceOptions |
| `DB_DIALECT` | `highgo` | 返回 TypeORM `postgres` 驱动 DataSourceOptions |
| `DB_DIALECT` | 其他任意值 | 抛出错误，应用拒绝启动 |

DatabaseModule (`TypeOrmModule.forRootAsync`) 和 CLI DataSource (`data-source.ts`) 均调用同一工厂，配置不会漂移。

### MySQL 分支专属参数

- `connectTimeout: 10000`（ms）
- `extra: { charset: 'utf8mb4_unicode_ci' }`（仅 MySQL 有效）

### HighGo 分支专属参数

- 默认端口 `5866`（HighGo 默认，可用 `DB_PORT` 覆盖）
- `schema`：读取 `DB_SCHEMA`，默认 `public`
- `ssl`：`DB_SSL=true` 时启用 SSL，**默认校验证书**（`rejectUnauthorized: true`）；如需兼容自签名证书，需同时设置 `DB_SSL_INSECURE=true`（非生产环境）

---

## MySQL 与 HighGo 驱动映射

| `DB_DIALECT` | TypeORM type | npm 包 |
|---|---|---|
| `mysql` | `'mysql'` | `mysql2@3.22.5`（package.json: `^3.22.5`）|
| `highgo` | `'postgres'` | `pg@8.21.0`（package.json: `^8.21.0`）|

HighGo 是 PostgreSQL 兼容数据库，使用标准 `pg` 驱动，无需专属驱动。

---

## 实体与迁移一致性检查

| 实体 | 表名 | 字段数 | created_at | updated_at | deleted_at | 外键数 |
|---|---|---|---|---|---|---|
| SysUser | sys_user | 11 | ✓ | ✓ | ✓ | 0 |
| SysRole | sys_role | 8 | ✓ | ✓ | ✓ | 0 |
| SysPermission | sys_permission | 8 | ✓ | ✓ | — | 0 |
| SysUserRole | sys_user_role | 4 | ✓ | — | — | 2 |
| SysRolePermission | sys_role_permission | 4 | ✓ | — | — | 2 |

迁移字段类型与实体装饰器逐项核对：
- 主键全部 `varchar(36)`，无自增 ✓
- 状态字段 `varchar(20)`，无数据库 enum ✓
- 无 JSON/JSONB 列 ✓
- 无存储过程、触发器 ✓
- `synchronize: false`（工厂和 DataSource 双重确认）✓

---

## 外键约束说明

| 外键名 | 所在表 | 列 | 引用表 | 引用列 | onDelete | onUpdate |
|---|---|---|---|---|---|---|
| `fk_sys_user_role_user_id` | sys_user_role | user_id | sys_user | id | NO ACTION | NO ACTION |
| `fk_sys_user_role_role_id` | sys_user_role | role_id | sys_role | id | NO ACTION | NO ACTION |
| `fk_sys_role_permission_role_id` | sys_role_permission | role_id | sys_role | id | NO ACTION | NO ACTION |
| `fk_sys_role_permission_permission_id` | sys_role_permission | permission_id | sys_permission | id | NO ACTION | NO ACTION |

选用 `NO ACTION` 而非 `CASCADE`：系统使用逻辑删除（deleted_at），禁止数据库级联物理删除业务数据。`NO ACTION` 在事务结束时检查约束，与 TypeORM 软删除语义兼容。

---

## 迁移重写说明

旧迁移（已在 MySQL revert，见下文执行顺序）使用手写 SQL，含 MySQL 专属语法（ENGINE=InnoDB、UNIQUE KEY、KEY、反引号、utf8mb4）。

新迁移使用 TypeORM Schema API（`createTable` / `dropTable` + `Table` / `TableIndex` / `TableForeignKey`），同一 TypeScript 代码由 TypeORM 按当前连接方言生成对应 DDL：

- MySQL：标准 `CREATE TABLE ... ENGINE=InnoDB`（TypeORM 自动添加）
- HighGo/PostgreSQL：`CREATE TABLE ...`（无 ENGINE，无 utf8mb4）

迁移文件源码不含任何方言特定字符串。

### `up()` 建表顺序

1. sys_user（无外键）
2. sys_role（无外键）
3. sys_permission（无外键）
4. sys_user_role（外键引用 sys_user、sys_role）
5. sys_role_permission（外键引用 sys_role、sys_permission）

### `down()` 删表顺序（严格对称）

1. sys_role_permission（释放对 sys_role、sys_permission 的外键）
2. sys_user_role（释放对 sys_user、sys_role 的外键）
3. sys_permission
4. sys_role
5. sys_user

---

## 两种方言验证结果

### MySQL 实连验证（MySQL 8.0.46 on 127.0.0.1）

| 操作 | 结果 |
|---|---|
| 1. 旧迁移 `migration:revert` | ✅ DROP TABLE IF EXISTS 5 张表（旧 down()）|
| 2. 替换迁移内容 | ✅ |
| 3. `npm run build` | ✅ |
| 4. 首次 `migration:run` | ✅ 5 张表全部创建，含 4 个 CONSTRAINT FK |
| 5. 表结构核查（INFORMATION_SCHEMA.COLUMNS）| ✅ 字段名、类型、nullable、默认值完全匹配实体 |
| 6. 外键核查（INFORMATION_SCHEMA.KEY_COLUMN_USAGE）| ✅ 4 个 FK 全部存在并指向正确列 |
| 7. 索引核查（INFORMATION_SCHEMA.STATISTICS）| ✅ 所有 UK 和 IDX 均按设计创建 |
| 8. `migration:revert` | ✅ 外键先删、表后删，无约束冲突 |
| 9. 再次 `migration:run` | ✅ 重新创建成功 |
| 10. Public API 冒烟测试 | ✅ /home/config, /service-guide/depts, /stats/click 均 code 0 |

### HighGo 验证

当前环境无 HighGo 实例，未进行实连验证。

已完成的非连接验证：

| 验证项 | 方式 | 结果 |
|---|---|---|
| highgo 配置生成 postgres DataSourceOptions | 单元测试 `buildDataSourceOptions` | ✅ |
| highgo 发现 5 个实体 | 单元测试 | ✅ |
| highgo 使用同一迁移 | 单元测试 | ✅ |
| 迁移源码无 MySQL 专属 DDL | 静态扫描测试（读取 .ts 源文件）| ✅ |
| 迁移使用 TableForeignKey，4 个外键名齐全 | 静态扫描测试 | ✅ |

---

## 实际迁移执行顺序（开发数据库）

```
1. npm run migration:revert       # revert 旧 MySQL-only 迁移（DROP TABLE IF EXISTS）
   # → 5 张业务表已删除，migrations 表清空

2. 替换 src/database/migrations/1749686400000-CreateRbacTables.ts

3. npm run build                  # 编译新迁移为 dist/

4. npm run migration:run          # 执行新 Schema API 迁移
   # → 5 张业务表重建，4 个 FK CONSTRAINT 创建

5. 验证结构与外键

6. npm run migration:revert       # 再次 revert（验证 down() 对称性）
   # → dropTable 自动删 FK，再按顺序 DROP 5 张表

7. npm run migration:run          # 再次执行（确认幂等）
   # → 成功，迁移最终留存于 migrations 表
```

---

## 自动化测试结果

| 测试套件 | 测试数 | 结果 |
|---|---|---|
| database-config.spec.ts | 40 | ✅ passed |
| stats.spec.ts | 35 | ✅ passed |
| **合计** | **75** | **✅ 全部通过，无 Force exiting** |

---

## 未完成事项与剩余风险

1. **HighGo 实连未验证**：无 HighGo 实例。TypeORM `postgres` 驱动已安装，配置工厂逻辑已单元测试覆盖，迁移 Schema API 跨方言静态验证通过。生产部署前，DBA 需提供 HighGo 实例进行完整迁移验证。

2. **HighGo 版本差异**：HighGo 各版本对 PostgreSQL 语法的兼容度不同（部分版本不支持 `TIMESTAMP WITH TIME ZONE`、`RETURNING` 等）。建议在目标 HighGo 版本上全量测试迁移和 TypeORM 基础 CRUD。

3. **`pg` 版本锁定**：安装 `pg@8.21.0`（锁定于 package-lock.json），package.json 声明 `^8.21.0`。`pg@9.x` 为大版本更新，升级前需重新验证 TypeORM 兼容性。

4. **TypeORM 在 MySQL 中仍生成 ENGINE=InnoDB**：这是 TypeORM MySQL Driver 的内置行为（不在迁移源码中，而是 TypeORM 内部生成）。对 MySQL 无影响；HighGo 迁移由 TypeORM postgres driver 执行，不经过 MySQL 路径。

5. **`updated_at` 不依赖数据库触发器**：`@UpdateDateColumn` 由 TypeORM `save()` 更新，直接 `UPDATE` SQL 不会触发。HighGo 无 `ON UPDATE CURRENT_TIMESTAMP`，这是有意设计。

6. **Step 3 准备就绪**：SysUser / SysRole 实体和表结构已就绪，Step 3（AuthModule）可直接在此基础上实现登录和 JWT。
