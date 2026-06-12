# 014 · Step 5 ContentModule 第一阶段验收修复
> **历史环境警告（2026-06-12）**：本文中的 `oms_db`、`mydb`、`MYSQL_CONTENT_TEST_*` 仅用于保留当时交付事实，现已全部停用，严禁复制执行。当前开发库为 `touch_kiosk_dev`，测试库为 `touch_kiosk_test`；有效变量与保护规则以 `backend/.env.example`、`CLAUDE.md` 为准。


**交付日期**：2026-06-12  
**基于**：013-step5-content-module-phase1.md 验收问题清单  
**状态**：✅ 完成（PublishModule 未实现）

---

## 一、验收项修复摘要

| # | 验收项 | 修复方式 |
|---|---|---|
| 1 | HighGo 兼容性 | `is_top` / `is_recommend`：`tinyint` → `smallint`（实体 + 迁移） |
| 2 | 版本语义 | 创建/编辑草稿不再写 `current_version_id`；编辑基于最新 `version_no` 复制字段 |
| 3 | 数据库完整性 | 新增 `(content_id, version_no)` 唯一索引；`current_version_id` → `content_version.id` 外键 |
| 4 | 业务校验 | 分类/内容类型一致、父子分类类型一致；非法参数改 `400`；`isTop`/`isRecommend` 仅 0/1 |
| 5 | MySQL 集成测试 | 新增 `content-mysql-integration.spec.ts`，专用库 `MYSQL_CONTENT_TEST_DATABASE` |
| 6 | HighGo 元数据测试 | 新增 `highgo-metadata.spec.ts`，`EntityMetadataBuilder` 无连接构建元数据 |
| 7 | Seed 迁移行为测试 | 新增 `seed-content-permissions-migration.spec.ts` |

---

## 二、迁移修订策略

### 新库（全新 `migration:run`）

1. `CreateContentTables1749859200000` 已同步为 **smallint**、唯一索引 `uk_content_version_content_version_no`、FK `fk_content_item_current_version_id`。
2. `AlterContentTablesIntegrity1749873600000` 对索引/FK 做 **存在性检查**（幂等），列类型变更可重复执行。

### 现有开发库（已执行旧版 CreateContentTables）

1. 执行新迁移 `AlterContentTablesIntegrity1749873600000`：
   - `ALTER` `is_top` / `is_recommend` → `smallint`
   - `CREATE UNIQUE INDEX uk_content_version_content_version_no`
   - `UPDATE content_item SET current_version_id = NULL`（草稿阶段语义纠正）
   - `ADD FK fk_content_item_current_version_id`
2. **不修改**已记录在 `migrations` 表中的历史迁移名；仅追加第 5 条迁移。
3. `down()` 可回滚列类型与约束（生产慎用）。

### 本环境执行记录

```
[X] CreateRbacTables1749686400000
[X] SeedRbacData1749772800000
[X] CreateContentTables1749859200000
[X] SeedContentPermissions1749862800000
[X] AlterContentTablesIntegrity1749873600000
```

`mydb` 已验证：`is_top` / `is_recommend` 列为 `smallint`，唯一索引与外键均已创建。

---

## 三、HighGo 元数据验证结果

测试文件：`backend/test/highgo-metadata.spec.ts`

| 用例 | 结果 |
|---|---|
| `DB_DIALECT=highgo` 下构建 9 个实体元数据（无真实连接） | ✅ 通过 |
| 全实体列扫描：禁止 `tinyint` / `enum` / `json` / `jsonb` | ✅ 0 违规 |
| `content_item.is_top` / `is_recommend` 类型为 `smallint` | ✅ 通过 |

实现方式：`EntityMetadataBuilder` + `getMetadataArgsStorage()`，使用 postgres 驱动配置构建完整列元数据，无需连接 HighGo 实例。

---

## 四、真实 MySQL ContentModule 集成测试

### 启用方式

```bash
cd backend
MYSQL_CONTENT_TEST_DATABASE=oms_db npm run test:integration:mysql:content
```

| 安全约束 | 实现 |
|---|---|
| 显式启用 | `RUN_MYSQL_CONTENT_INTEGRATION=true`（npm script 已内置） |
| 拒绝 production | `NODE_ENV=production` 抛错 |
| 专用测试库 | 必须设置 `MYSQL_CONTENT_TEST_DATABASE`，且 **不得等于** `DB_NAME` |
| 失败即失败 | 无 catch 静默通过 |
| 测试后清理 | `afterAll` 删除本用例创建的 category/item/version |

### 本环境执行结果（`MYSQL_CONTENT_TEST_DATABASE=oms_db`，`DB_NAME=mydb`）

| 用例 | 结果 |
|---|---|
| 创建内容 + 首版本，`current_version_id` 为 null | ✅ |
| 编辑追加版本，`current_version_id` 保持 null | ✅ |
| 内容与分类 contentType 冲突 → 400 | ✅ |
| 父子分类 contentType 冲突 → 400 | ✅ |
| `(content_id, version_no)` 唯一约束 | ✅ |
| 逻辑删除 `deleted_at` 非空 | ✅ |
| 事务回滚无残留 | ✅ |
| 非法 content_type → 400（非 403） | ✅ |

**8 passed，0 failed**

---

## 五、全量验证结果

```bash
cd backend
npm run type-check          # ✅
npm run build               # ✅
npm test -- --runInBand     # ✅ 273 passed, 9 skipped
npm run test:integration:mysql          # ✅ 1 passed（SUPER_ADMIN 并发）
npm run test:integration:mysql:content  # ✅ 8 passed（显式启用）
npm run migration:show      # ✅ 5 条迁移均为 [X]

cd ../kiosk-app && npm run build                    # ✅
cd ../admin-web && npm run type-check && npm run build  # ✅
```

### 测试计数

| 类别 | passed | skipped | failed |
|---|---|---|---|
| 默认 `npm test` | 273 | 9 | 0 |
| MySQL SA 集成（显式） | 1 | 0 | 0 |
| MySQL Content 集成（显式） | 8 | 0 | 0 |
| **合计（含显式集成）** | **282** | **9** | **0** |

跳过的 9 项：MySQL 集成套件默认 `describe.skip`（需环境变量显式启用）。

### 新增/更新测试文件

| 文件 | 新增用例 |
|---|---|
| `highgo-metadata.spec.ts` | 3 |
| `seed-content-permissions-migration.spec.ts` | 7 |
| `content-mysql-integration.spec.ts` | 8 |
| `content.spec.ts` | +3（类型校验、版本语义） |
| `content-migration.spec.ts` | +7（smallint、Alter 迁移） |
| `database-config.spec.ts` | 更新为 5 迁移 |

---

## 六、主要代码变更

| 文件 | 变更 |
|---|---|
| `content-item.entity.ts` | `smallint` |
| `content-version.entity.ts` | 唯一索引装饰器 |
| `1749859200000-CreateContentTables.ts` | smallint + 唯一索引 + FK；`down()` 先删 FK |
| `1749873600000-AlterContentTablesIntegrity.ts` | **新建** 修订迁移 |
| `items.service.ts` | 版本语义、分类类型校验、`BadRequestException` |
| `categories.service.ts` | 父子类型校验、`BadRequestException` |
| `update-item.dto.ts` | `@IsIn([0, 1])` |
| `database-config.factory.ts` | 注册第 5 条迁移 |
| `package.json` | `test:integration:mysql:content` script |

---

## 七、剩余风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| HighGo 真实连接未测 | 元数据测试无真实瀚高实例 | 生产部署前在 HighGo 环境执行 `migration:run` + 冒烟 |
| 测试库权限 | 本环境无法 `CREATE DATABASE`，使用已有 `oms_db` | 文档要求显式设置 `MYSQL_CONTENT_TEST_DATABASE` |
| `current_version_id` 清空 | Alter 迁移将既有草稿的 `current_version_id` 置 null | 符合 Phase 1 语义；PublishModule 负责发布时写入 |
| DTO 层 `isTop`/`isRecommend` | 仅 `UpdateItemDto` 限制 0/1；创建时固定 0 | 符合当前 API 设计 |

---

## 八、明确未做事项

- PublishModule（发布时设置 `current_version_id`）
- 群众端内容接口 / 页面
- admin-web、kiosk-app 业务改动
- 二期功能
