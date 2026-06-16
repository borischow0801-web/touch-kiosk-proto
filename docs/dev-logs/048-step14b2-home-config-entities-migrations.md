# 048 · Step 14B-2 首页配置 Entity、Migration 与权限种子

**交付日期**：2026-06-16  
**基于**：047-step14b1a-home-config-baseline-closure.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

本阶段实现首页配置三张业务表的 Entity、TypeORM 迁移与权限种子，并注册至 `database-config.factory.ts`。**未实现** Service、Controller、Publish 适配器或前端改造。

**未修改**：`admin-web/`、`kiosk-app/`、`deploy/`、基线文档、环境变量真实连接信息。  
**未连接或操作**任何数据库（含 `touch_kiosk_dev`、`oms_db`）。

---

## 二、修改文件清单

### 新增 Entity

| 文件 | 表名 |
|---|---|
| `backend/src/database/entities/home-config.entity.ts` | `home_config` |
| `backend/src/database/entities/home-config-version.entity.ts` | `home_config_version` |
| `backend/src/database/entities/home-module.entity.ts` | `home_module` |

### 新增 Migration

| 文件 | 说明 |
|---|---|
| `1749925200000-CreateHomeConfigTables.ts` | 建表 + 索引 + 外键 |
| `1749928800000-SeedHomeConfigPermissions.ts` | 7 个 home 权限 |
| `1749932400000-SeedHomeConfigRolePermissions.ts` | CONTENT_EDITOR 角色授权 |

### 修改

| 文件 | 变更 |
|---|---|
| `backend/src/database/database-config.factory.ts` | 注册 3 Entity + 3 Migration |
| `backend/test/database-config.spec.ts` | 17 Entity / 17 Migration 断言 |
| `backend/test/highgo-metadata.spec.ts` | 17 Entity 元数据 |

### 新增测试

| 文件 | 说明 |
|---|---|
| `backend/test/home-config-migration.spec.ts` | DDL 兼容性静态扫描 |
| `backend/test/seed-home-config-permissions-migration.spec.ts` | 权限种子幂等行为 |

---

## 三、Entity 字段说明

### home_config（extends BaseBusinessEntity）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | varchar(36) | UUID 主键 |
| config_name | varchar(50) | 默认 `default` |
| status | varchar(20) | draft / pending / published / … |
| current_version_id | varchar(36) 可空 | 指向已发布版本 |
| created_by / updated_by | varchar(36) 可空 | 审计 |
| created_at / updated_at / deleted_at | timestamp | 公共时间字段 |

### home_config_version（只追加，无 deleted_at）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | varchar(36) | UUID 主键 |
| home_config_id | varchar(36) | FK → home_config |
| version_no | int | 应用分配，非自增 |
| title / subtitle | varchar(255) | 展示标题 |
| top_banner_json / theme_json | text | 序列化 JSON 字符串 |
| status | varchar(20) | 版本状态 |
| change_remark | varchar(255) 可空 | 变更说明 |
| created_by | varchar(36) 可空 | |
| created_at | timestamp | |

### home_module（extends BaseBusinessEntity）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | varchar(36) | UUID 主键 |
| home_config_version_id | varchar(36) | **归属版本**，非 home_config_id |
| module_code / module_name / module_type | varchar | 模块标识 |
| icon / color / layout_type | varchar 可空 | 展示 |
| is_visible | smallint | 0/1 |
| sort_order | int | 排序 |
| target_type / target_value | varchar | 跳转目标 |
| created_at / updated_at / deleted_at | timestamp | 逻辑删除 |

---

## 四、Migration 兼容性说明

| 检查项 | 实现 |
|---|---|
| 主键 | 全部 `varchar(36)`，无 AUTO_INCREMENT |
| 状态 | `varchar`，无 ENUM |
| JSON 配置 | `top_banner_json`、`theme_json` 为 `text` |
| 布尔 | `is_visible` 为 `smallint` |
| 触发器 / 存储过程 | 未使用 |
| 方言专属 DDL | 仅用 TypeORM `Table` / `TableIndex` / `TableForeignKey` API |
| config_name 单例 | **仅** `idx_home_config_config_name` 普通索引；无部分唯一索引 |
| version_no 唯一 | `uk_home_config_version_config_version_no`（home_config_id + version_no） |
| 外键 | `fk_home_config_version_home_config_id`、`fk_home_module_home_config_version_id`、`fk_home_config_current_version_id`；均为 NO ACTION |

---

## 五、权限 seed 说明

### 权限码（prefix `00000009`，moduleCode `home`）

| permissionCode | sortOrder |
|---|---|
| home:config:read | 43 |
| home:config:update | 44 |
| home:module:read | 45 |
| home:module:create | 46 |
| home:module:update | 47 |
| home:module:delete | 48 |
| home:module:sort | 49 |

### 角色授权

| 角色 | 授权方式 |
|---|---|
| SUPER_ADMIN | 运行时通配 `['*']`（PermissionsGuard / AuthService），**无需** role_permission 种子 |
| CONTENT_EDITOR | `SeedHomeConfigRolePermissions` 授予全部 7 项 home 权限（prefix `0000000a`） |

### 幂等性

- 固定 UUID；`up()` 按 id 跳过已存在且字段一致的记录；`permissionCode` 冲突时明确失败。
- `down()` 有 role_permission 引用时拒绝回滚。

---

## 六、测试结果

```bash
cd backend && npm test -- --runInBand
```

| 指标 | 结果 |
|---|---|
| Test Suites | 30 passed, **6 skipped**, 36 total |
| Tests | **577 passed**, 35 skipped, 612 total |
| 新增套件 | `home-config-migration.spec.ts`、`seed-home-config-permissions-migration.spec.ts` 全部通过 |
| `git diff --check backend/` | 通过 |

**跳过说明**：6 个 skipped 套件为需真实 MySQL 连接的集成测试（如 `mysql-integration.spec.ts`、`content-migration-fresh-install.spec.ts` 等），本环境未连接数据库，按既有模式跳过，**非伪造通过**。

---

## 七、声明

- **未连接或操作**任何数据库实例；迁移仅通过静态扫描与内存 mock 验证。
- **未修改** admin-web、kiosk-app、deploy、基线文档。
- **未实现** HomeConfigService、Admin/Public Controller、PublishService `home_config` 适配器。

---

## 八、下一步（14B-3）

1. 实现 `HomeConfigService`：`PUT` 隐式草稿、版本状态机、模块 CRUD/排序。
2. 实现 Admin API `/api/admin/home/*`。
3. 扩展 `PublishService` 支持 `bizType=home_config`。
