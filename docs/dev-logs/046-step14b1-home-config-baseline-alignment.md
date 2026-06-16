# 046 · Step 14B-1 首页配置数据库与 API 基线统一

**交付日期**：2026-06-15
**基于**：045-step14a-home-config-design-review.md  
**执行方**：Cursor  
**状态**：通过（纯文档基线，未进入实现；状态机与 503 语义经 **047 · 14B-1A** 最终收口）

---

## 一、执行范围

本阶段 **仅修订基线文档**，按 Codex 确定的 21 条方案统一 `home_config` 数据模型、模块归属、发布语义与 Public/Admin API 契约。

**允许修改**：

| 文件 | 变更性质 |
|---|---|
| `docs/database.md` | 重写 §六 首页配置模型 |
| `docs/architecture.md` | 模块职责、群众端首页、§8 首页发布小节 |
| `docs/api-spec.md` | 扩展 §十 首页配置接口 |
| `CLAUDE.md` | §6 版本规则、§7 HomeConfigModule 职责（消除与基线冲突） |
| `docs/dev-logs/046-step14b1-home-config-baseline-alignment.md` | 本报告 |

**未修改**：`backend/`、`admin-web/`、`kiosk-app/`、`deploy/`、任何迁移与环境配置。  
**未连接或操作**：`touch_kiosk_dev`、`oms_db` 或其他数据库。

---

## 二、实际修改摘要

### 2.1 `docs/database.md`

- 明确一期 **单一逻辑配置**：`config_name=default`，主键 UUID v4，禁止固定非 UUID 主键。
- 新增 **`home_config_version`** 表定义（`title`、`subtitle`、`top_banner_json`、`theme_json`、`status` 等）。
- 精简 **`home_config`** 主表：移除展示字段至版本表；保留 `current_version_id` 指向当前已发布版本。
- 修订 **`home_module`**：`home_config_version_id` 归属版本；新增 `deleted_at`；禁止直接 FK `home_config_id`。
- 约定草稿创建时 **复制模块行**；草稿编辑不影响已发布版本。
- 补充与 **`guide_item_config`** 的职责边界表。
- 补充发布状态变化表、`publish_record`（`biz_type=home_config`）约定。
- 更新 §十二 关系图：首页配置 → 版本 → 模块 → 发布记录；高频事项独立走 `guide_item_config`。

### 2.2 `docs/architecture.md`

- `GuideConfigModule`：明确高频/推荐由 `is_hot`、`is_recommend` 管理，**不**写入 `home_config_version`。
- `HomeConfigModule`：版本+模块+发布；Public Home API **组合输出**；不负责高频事项与通知正文。
- 修复误删的 **`NavigationModule`** 小节标题。
- §六 群众端首页：模块来源拆分；无已发布配置时 **503** + 离线兜底。
- §八 新增 **首页配置发布（home_config）** 专节，与 database / api-spec 对齐。

### 2.3 `docs/api-spec.md`

- §十 由路径清单扩展为完整契约：
  - 权限码表（`home:config:*`、`home:module:*`、共用 `publish:*`）
  - Admin GET/PUT 配置与草稿语义
  - 模块 CRUD + **`PUT /modules/sort`** 请求体 `{ items: [{ id, sortOrder }] }`
  - 统一发布路径 `/api/admin/publish/home_config/:bizId/*`
  - Public `GET /api/public/home/config` 组合来源与响应字段
  - 无已发布配置：**`code=503`**，禁止示例/mock 数据

### 2.4 `CLAUDE.md`（确有冲突时修订）

- §6：补充 `home_config_version`、`home_module` 版本归属与复制规则。
- §7：`HomeConfigModule` 职责与 architecture 一致。

---

## 三、最终确定的数据关系

```
home_config（逻辑单例，config_name=default，UUID 主键）
  ├─ status（draft / pending / published / rejected / withdrawn / archived）
  ├─ current_version_id → 当前生效的已发布 home_config_version.id（撤回时清空）
  └─ 1:N → home_config_version（只追加）
         ├─ title, subtitle, top_banner_json(text), theme_json(text), status, ...
         └─ 1:N → home_module（home_config_version_id，含 deleted_at）

guide_item_config（GuideConfigModule）
  └─ is_hot / is_recommend → Public API 运行时组合，不写入版本快照

content_item（notices, published）→ Public API 通知摘要

publish_record
  └─ biz_type=home_config, biz_id=home_config.id, version_id=home_config_version.id
```

**关键决策（相对 045 报告）**：

| 议题 | 14B-1 确定方案 |
|---|---|
| 版本表 | **新增** `home_config_version` |
| 模块存储 | **保留** `home_module` 物理表，**不** 使用 `modules_json` |
| 模块归属 | `home_config_version_id`，非 `home_config_id` |
| 高频事项 | `guide_item_config`，**不** 快照进版本 |
| 单例 | 一期仅 `config_name=default`，UUID 主键 |

---

## 四、API 契约调整

### 4.1 管理端

| 接口 | 要点 |
|---|---|
| `GET/PUT /api/admin/home/config` | 操作/返回 **当前草稿版本**；`PUT` 为唯一编辑入口（*draft 显式 POST 已废止，见 047*） |
| `GET/POST/PUT/DELETE /api/admin/home/modules*` | 仅当前草稿版本；DELETE 为逻辑删除 |
| `PUT /api/admin/home/modules/sort` | `{ items: [{ id, sortOrder }] }` |
| `/api/admin/publish/home_config/:bizId/*` | `bizId` = `home_config.id`；rollback 需 `versionId` |

### 4.2 群众端

`GET /api/public/home/config` 由后端组合：

1. 已发布首页版本（`status=published` 且 `current_version_id` 有效）
2. 该版本可见 `home_module`
3. `guide_item_config` 中 `is_visible=1` 且（`is_hot=1` 或 `is_recommend=1`）
4. 已发布 `notices` 摘要

**不返回**：draft / pending / rejected / withdrawn / archived 及后台审计字段。

**无已发布配置**：**HTTP 503**，响应信封 `code=503`、`data=null`；群众端本地离线配置兜底。（*503 语义经 047 · 14B-1A 收口为 HTTP 503，非 HTTP 200。*）

---

## 五、发布状态变化（统一约定）

状态值（varchar）：`draft`、`pending`、`published`、`rejected`、`withdrawn`、`archived`。

| 操作 | home_config | home_config_version | current_version_id |
|---|---|---|---|
| 保存草稿 | 保持或 draft | 更新/新建 draft + 模块 | 不变 |
| 提交审核 | 可 pending | draft → pending | 不变 |
| 审核通过 / 直接发布 | → published | 目标版本 → published | **更新为新版本** |
| 驳回 | rejected 或保持 published | pending → rejected | 不变 |
| 撤回 | → withdrawn | 当前生效版本 → withdrawn | **清空** |
| 回滚 | 保持 published 或 withdrawn | 复制历史版本+模块为新 draft | 不变直至再发布 |

补充语义：

- 新版本发布时，**历史 published 版本保留**，不自动改为 withdrawn。
- 回滚产物为 draft，**须重新审核或直接发布** 方生效。
- 所有发布操作写入 `publish_record`，`biz_type=home_config`。

---

## 六、兼容性检查

| 检查项 | 结果 |
|---|---|
| 主键 `varchar(36)` UUID | ✅ 三文档一致 |
| 禁止自增主键 | ✅ `version_no` 由应用分配 |
| 禁止数据库 ENUM | ✅ `status` 均为 varchar |
| 禁止数据库 JSON 类型 | ✅ `top_banner_json`、`theme_json` 为 text 语义 |
| 禁止触发器 / 存储过程 | ✅ 未引入 |
| 逻辑删除 | ✅ `home_module.deleted_at`；主表 `deleted_at` |
| MySQL 8 / HighGo | ✅ 标准 SQL、text 存 JSON 字符串 |
| 文档无具体 SQL | ✅ 未写入 DDL/DML 语句 |

---

## 七、三文档一致性核对

| 主题 | database | architecture | api-spec |
|---|---|---|---|
| 单一逻辑配置 + UUID | ✅ | ✅ | ✅ |
| home_config_version 存在 | ✅ | ✅ | ✅（字段映射） |
| home_module 归属版本 | ✅ | ✅ | ✅（草稿 CRUD） |
| 高频事项边界 | ✅ | ✅ | ✅（homeHotItems 运行时） |
| Public 仅已发布 | ✅ | ✅ | ✅ |
| 无发布 → 503 | ✅ | ✅ | ✅ |
| 撤回清空 current_version_id | ✅ | ✅ | ✅ |
| 历史 published 保留 | ✅ | ✅ | ✅ |
| publish_record biz_type | ✅ | ✅ | ✅ |

已消除 045 指出的主要冲突：`current_version_id` 无版本表、模块挂主表、`modules_json` 与物理表歧义、高频事项来源未定、Public mock 兜底语义不清。

---

## 八、验证结果

| 验证项 | 结果 |
|---|---|
| `git diff --check`（本阶段涉及文件） | ✅ 无空白错误 |
| 本阶段文件范围 | ✅ 仅 `docs/database.md`、`docs/architecture.md`、`docs/api-spec.md`、`CLAUDE.md`、本报告 |
| backend / admin-web / kiosk-app / deploy | ✅ **本阶段未修改**（工作区存在其他 Step 遗留改动，不在 14B-1 范围内） |
| 文档禁项扫描 | ✅ 无自增主键、ENUM、DB JSON、触发器、存储过程设计 |
| `npm` 测试 / 构建 | ⏭ **未运行** — 本阶段为纯文档任务，无代码变更，按任务要求不要求执行 |

---

## 九、声明

- **未修改** 任何业务代码（backend / admin-web / kiosk-app）。
- **未创建** Entity、Migration 或环境配置。
- **未连接或操作** 任何数据库实例。
- **未进入** Step 14B-2（Entity + Migration）及后续实现。

---

## 十、下一步建议（14B-2，不在本阶段执行）

1. 创建 `home_config`、`home_config_version`、`home_module` Entity 与迁移。
2. Seed `home:config:*`、`home:module:*` 权限。
3. 实现 `HomeConfigService` 草稿/版本/模块 CRUD 与 `PublishService` 的 `home_config` 适配器。
