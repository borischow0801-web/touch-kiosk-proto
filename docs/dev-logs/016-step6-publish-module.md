# 016 · Step 6 PublishModule 审核发布流程
> **历史环境警告（2026-06-12）**：本文中的 `oms_db`、`mydb`、`MYSQL_CONTENT_TEST_*` 仅用于保留当时交付事实，现已全部停用，严禁复制执行。当前开发库为 `touch_kiosk_dev`，测试库为 `touch_kiosk_test`；有效变量与保护规则以 `backend/.env.example`、`CLAUDE.md` 为准。


**交付日期**：2026-06-12  
**基于**：015-step5-migration-ownership-closure.md  
**状态**：✅ 完成

---

## 一、任务目标

1. 补齐专用测试库（`oms_db`）全新安装迁移验证（7 条迁移全量执行）。
2. 实现 `PublishModule`：`publish_record` 表、content 状态机、7 个管理端接口、7 条发布权限。
3. 修复已发布内容编辑时主表 `title`/`summary` 不泄露草稿语义。
4. 补齐单元/集成/并发/权限测试，并通过真实 MySQL 发布链路验证。

---

## 二、状态机及已实现操作

本阶段仅支持 `bizType=content`，其他类型返回 **400**。

### 版本（content_version）状态流转

| 操作 | from → to | 说明 |
|---|---|---|
| submit | draft → pending | 提交审核 |
| approve | pending → published | 审核通过 |
| reject | pending → rejected | 审核驳回 |
| direct-publish | draft → published | 直接发布（独立权限） |
| withdraw | published → withdrawn | 撤回（版本同步 withdrawn） |
| rollback | — → draft（新版本） | 复制历史版本为新草稿，**不修改原版本** |

### 主表（content_item）状态流转

| 场景 | item 状态变化 |
|---|---|
| 首次 submit | draft/rejected → pending |
| 已发布内容产生新草稿 submit | item **保持 published** |
| approve / direct-publish | → published，设置 `current_version_id`、`title`、`summary`、`publish_at` |
| reject（item 原为 pending） | → rejected |
| reject（已发布内容的新草稿） | item **保持 published** |
| withdraw | → withdrawn |

### 非法操作

所有不符合当前状态的操作返回 **409 Conflict**；`bizId` / `versionId` 不存在返回 **404**。

---

## 三、publish_record 表设计

迁移：`1749880800000-CreatePublishRecordTable.ts`

| 字段 | 类型 | 说明 |
|---|---|---|
| id | varchar(36) | UUID v4，后端生成 |
| biz_type | varchar(50) | 本阶段仅 `content` |
| biz_id | varchar(36) | 业务主键（content_item.id） |
| version_id | varchar(36) | 关联版本 |
| action | varchar(50) | submit / approve / reject / direct-publish / withdraw / rollback |
| from_status | varchar(20) | 操作前状态 |
| to_status | varchar(20) | 操作后状态 |
| comment | varchar(500) nullable | 长度限制 500，可选 |
| operator_id | varchar(36) | 操作人 |
| operated_at | timestamp | 操作时间 |

**索引**：`idx_publish_record_biz`、`idx_publish_record_version_id`、`idx_publish_record_operator_id`、`idx_publish_record_operated_at`

**约定**：无 `deleted_at`（审计流水表，只追加）；无自增、ENUM、JSON 列、触发器或存储过程。

---

## 四、权限清单

迁移：`1749884400000-SeedPublishPermissions.ts`（prefix `00000004`，不修改已执行 RBAC/Content 权限迁移）

| permission_code | 名称 | 用途 |
|---|---|---|
| publish:record:read | 查看发布记录 | GET records |
| publish:submit | 提交审核 | submit |
| publish:approve | 审核通过 | approve |
| publish:reject | 审核驳回 | reject |
| publish:direct-publish | 直接发布 | direct-publish（独立权限） |
| publish:withdraw | 撤回发布 | withdraw |
| publish:rollback | 版本回滚 | rollback |

提交与审核权限分离；`SUPER_ADMIN` 通过现有全权限机制覆盖。

种子迁移具备安全回滚测试：`backend/test/seed-publish-permissions-migration.spec.ts`。

---

## 五、并发控制方案

1. **数据库事务**：所有状态检查与写入在同一 `DataSource.transaction` 内完成。
2. **悲观写锁**：每次操作对 `content_item` 执行 `pessimistic_write`（`lockItem`），防止重复审核与并发发布。
3. **原子写入**：业务表更新与 `publish_record` 插入同一事务；失败整体回滚，不留半完成状态。
4. **验证**：`publish-mysql-integration.spec.ts` 双并发 `approve` 用例确认最多一条 `approve` 记录。

---

## 六、current_version_id 切换规则

| 规则 | 行为 |
|---|---|
| 创建/编辑草稿 | `current_version_id` 保持 `null` 或指向**当前已发布版本** |
| 已发布内容编辑新版本 | 主表 `title`/`summary` **不更新**（`ItemsService.update` 修复） |
| approve / direct-publish 成功 | `current_version_id` 指向发布版本；主表 `title`/`summary` 与发布版本一致；设置 `publish_at` |
| 新草稿审核期间 | `current_version_id` 继续指向旧已发布版本 |
| 新草稿审核通过 | 切换至新版本；旧 published 版本保留历史 |
| rollback | 复制为新 draft 版本；**立即不改变** `current_version_id` |
| withdraw | 内容 withdrawn，公共接口将来不得展示（本阶段未实现 Public 内容 API） |

---

## 七、管理端接口

| 方法 | 路径 | 权限 |
|---|---|---|
| POST | `/api/admin/publish/:bizType/:bizId/submit` | publish:submit |
| POST | `/api/admin/publish/:bizType/:bizId/approve` | publish:approve |
| POST | `/api/admin/publish/:bizType/:bizId/reject` | publish:reject |
| POST | `/api/admin/publish/:bizType/:bizId/direct-publish` | publish:direct-publish |
| POST | `/api/admin/publish/:bizType/:bizId/withdraw` | publish:withdraw |
| POST | `/api/admin/publish/:bizType/:bizId/rollback` | publish:rollback |
| GET | `/api/admin/publish/:bizType/:bizId/records` | publish:record:read |

---

## 八、全新数据库迁移验证

### 专用测试库门禁

- 必须设置 `MYSQL_CONTENT_TEST_DATABASE`（≠ `DB_NAME`）且 `MYSQL_CONTENT_TEST_CONFIRM=true`
- 禁止对开发库 `mydb` 执行破坏性 schema 重置

### 全新安装测试

文件：`backend/test/content-migration-fresh-install.spec.ts`

| 验证项 | 结果 |
|---|---|
| `resetProjectSchema` 清空项目自有 11 张表（`SET FOREIGN_KEY_CHECKS=0`，不碰外来表） | ✅ |
| 从空 schema 执行全部 **7** 条迁移 | ✅ |
| 四张内容表存在 | ✅ |
| `content_item.is_top` 为 smallint | ✅ |
| `uk_content_version_content_version_no` 唯一索引 | ✅ |
| `fk_content_item_current_version_id` 外键 | ✅ |
| `publish_record` 表存在 | ✅ |
| 测试结束 `resetProjectSchema` + `runMigrations` 恢复约定最终状态 | ✅ |

### 迁移列表（7 条）

1. CreateRbacTables1749686400000  
2. SeedRbacData1749772800000  
3. CreateContentTables1749859200000  
4. SeedContentPermissions1749862800000  
5. AlterContentTablesIntegrity1749873600000  
6. CreatePublishRecordTable1749880800000  
7. SeedPublishPermissions1749884400000  

### 串行执行要求

**Content 集成、迁移生命周期、全新安装、Publish 集成必须串行**，不得并行操作同一测试库。

推荐命令：

```bash
cd backend
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true npm run test:integration:mysql:serial
```

串行顺序（`package.json`）：`mysql-integration` → `fresh-install` → `lifecycle` → `content` → `publish`。

辅助：`ensureDedicatedTestDatabaseReady` 在 content/publish 集成前确保 Alter 约束已应用。

---

## 九、真实 MySQL 发布链路结果

专用库 `oms_db`，`publish-mysql-integration.spec.ts`：

| 用例 | 结果 |
|---|---|
| submit → approve 设置 current_version_id 与 publish_record | ✅ |
| 已发布内容新草稿期间主表 title 不变，通过后切换 | ✅ |
| withdraw 后 item 为 withdrawn | ✅ |
| rollback 生成新 draft，current_version_id 不变 | ✅ |
| 非法 approve 返回 409 | ✅ |
| 双并发 approve 最多一条 approve 记录 | ✅ |

---

## 十、测试通过数与跳过数

| 套件 | 通过 | 跳过 |
|---|---|---|
| 单元/静态（`npm test -- --runInBand`，无集成 env） | **308** | **20**（5 个 MySQL 集成套件） |
| 串行 MySQL 集成（`test:integration:mysql:serial`） | **20** | 0 |
| **合计（全量串行验证后）** | **328** | 0 |

单元测试覆盖：`publish.spec.ts`（状态流转、409/404/400、401/403）、`publish-migration.spec.ts`、`seed-publish-permissions-migration.spec.ts`、`content.spec.ts`（已发布不更新主表 title）。

---

## 十一、已执行验证命令

```bash
cd backend
npm run type-check          # ✅
npm run build               # ✅
npm test -- --runInBand     # ✅ 308 passed, 20 skipped
npm run test:integration:mysql                                          # ✅ 1 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:integration:mysql:content                                  # ✅ 8 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:migration:lifecycle                                        # ✅ 4 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:integration:mysql:publish                                  # ✅ 6 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:migration:fresh-install                                    # ✅ 1 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:integration:mysql:serial                                   # ✅ 20 passed
npm run migration:show      # ✅ 7 条 [X]

cd ../kiosk-app && npm run build                                          # ✅
cd ../admin-web && npm run type-check && npm run build                    # ✅
```

---

## 十二、HighGo 未实连说明

- 迁移与实体类型按 MySQL 8 / HighGo 双方言规范编写（varchar 状态、无 ENUM/JSON 列、标准 SQL）。
- `highgo-metadata.spec.ts` 静态扫描已更新为 10 实体 / 7 迁移。
- **未连接真实 HighGo 实例**执行 migration:run 或发布链路集成；生产部署前需在 HighGo 环境复跑迁移与抽样发布流程。

---

## 十三、修改与新增文件清单（摘要）

### 新增

- `backend/src/database/entities/publish-record.entity.ts`
- `backend/src/database/migrations/1749880800000-CreatePublishRecordTable.ts`
- `backend/src/database/migrations/1749884400000-SeedPublishPermissions.ts`
- `backend/src/publish/*`（constants、content-publish.service、publish.service、module）
- `backend/src/admin-api/controllers/publish.controller.ts`
- `backend/test/publish.spec.ts`、`publish-migration.spec.ts`、`publish-mysql-integration.spec.ts`
- `backend/test/seed-publish-permissions-migration.spec.ts`
- `backend/test/content-migration-fresh-install.spec.ts`
- `backend/test/helpers/project-schema-reset.ts`、`content-test-cleanup.ts`、`ensure-test-db-ready.ts`

### 修改

- `backend/src/content/items.service.ts` — 已发布内容编辑不更新主表 title/summary
- `backend/src/admin-api/admin-api.module.ts` — 注册 PublishModule
- `backend/src/database/database-config.factory.ts` — 10 实体、7 迁移
- `backend/package.json` — 串行集成脚本
- `CLAUDE.md` — Step 6 状态更新

---

## 十四、未完成项与剩余风险

| 项 | 说明 |
|---|---|
| 群众端内容 Public API | 本阶段未实现；withdraw 后公共展示屏蔽待在 Public API 落地时过滤 `withdrawn` |
| admin-web 发布页面 | 未开发 |
| home_config / navigation / showcase 发布 | 仅 content 路由，其他 bizType 返回 400 |
| HighGo 实连验证 | 需部署前在目标环境执行 |
| 全量非法状态 409 矩阵 | 单元测试覆盖主要路径；未对每种 item×version 组合穷举 HTTP 用例 |
| 事务失败不留 publish_record | 通过集成链路间接验证；未单独 mock 中途失败注入用例 |
| 多角色权限分离 HTTP 测试 | 仅覆盖 401/403/SUPER_ADMIN；未逐权限建独立角色用例 |

---

## 十五、下一步建议

1. **Step 7**：Public API 内容读取（仅 `published` + `current_version_id` 指向版本）。
2. **admin-web**：内容列表 + 发布操作按钮，按权限显隐。
3. **HighGo**：在预发环境执行 7 条迁移 + 抽样 publish 流程。
4. 视需要扩展 `home_config` / `showcase` 的 Publish 适配器（复用 `publish_record` 与状态机模式）。
