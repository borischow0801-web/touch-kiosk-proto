# 045 · Step 14A 首页配置模块实施前设计核对

**交付日期**：2026-06-15  
**阶段**：Step 14A — 设计核对（只读）  
**执行方**：Cursor  
**状态**：完成，待 Codex 审查后进入 Step 14B 实现

---

## 零、本次执行声明

本次 **仅进行设计核对与报告输出**，明确如下：

| 项 | 状态 |
|---|---|
| 修改业务代码 | **未执行** |
| 创建或执行数据库迁移 | **未执行** |
| 操作数据库（含 `touch_kiosk_dev` / `oms_db`） | **未执行** |
| 修改 `database.md` / `architecture.md` / `api-spec.md` | **未执行**（按任务约束） |
| 开始 Step 14B 编码 | **未执行**（本报告完成后停止） |

---

## 一、现有首页配置代码与硬编码数据清单

### 1.1 后端（已实现部分）

| 路径 | 现状 |
|---|---|
| `backend/src/home-config/home-config.module.ts` | 仅注册 `HomeConfigService`，无 Entity / Repository |
| `backend/src/home-config/home-config.service.ts` | **硬编码** `getPublicConfig()`，返回固定原型数据 |
| `backend/src/public-api/controllers/home.controller.ts` | `GET public/home/config` → 调用上述 Service |
| `backend/src/public-api/public-api.module.ts` | 已挂载 `HomeController` |
| `backend/src/app.module.ts` | 已 import `HomeConfigModule` |

**硬编码字段（`home-config.service.ts`）**：

| 字段 | 值来源 | 说明 |
|---|---|---|
| `title` | 固定字符串 | 「政务服务触摸查询」 |
| `subtitle` | 固定字符串 | 「请在下方操作区点击选择」 |
| `idleSeconds` | 固定 `90` | 与 kiosk 默认一致 |
| `bannerLines` | 固定 2 行文案 | 顶部展示区 |
| `homeHotItems` | 6 条 mock 事项 | `i-001` … `i-006` |
| `nav` | 固定 4 项 | 首页 / 返回 / 重来 / 帮助 |

**原型遗留**：`backend/_prototype/index.fastify.ts` 含相同结构的 `config` 对象，与现 Service 数据一致。

### 1.2 后端（未实现部分）

| 能力 | 现状 |
|---|---|
| `home_config` / `home_module` Entity | **不存在**（`backend/src/database/entities/` 无相关文件） |
| 相关 Migration | **不存在** |
| Admin API `/api/admin/home/*` | **不存在**（`admin-api` 无 home 控制器） |
| `PublishService` 对 `home_config` | **明确拒绝**（`SUPPORTED_BIZ_TYPES = {'content'}`） |
| 权限 `home:config:*` | **未 seed** |
| `CacheModule` 首页缓存 | **未实现**（architecture 仅规划） |

### 1.3 群众端（kiosk-app）消费结构

| 消费点 | 数据来源 | 实际使用字段 |
|---|---|---|
| `App.vue` | `GET /api/public/home/config` | `title`、`subtitle`、`bannerLines`、`nav`、`idleSeconds` |
| `Home.vue` | 同上（二次请求） | `homeHotItems` |
| `api/types.ts` → `AppConfig` | 类型定义 | 上述字段，**无** `theme`、`modules` |
| `content/modules.ts` | **客户端硬编码** | 9 个政务公开模块卡片（`HOME_CONTENT_MODULES`） |
| `Home.vue` 固定按钮 | **客户端硬编码** | 「按部门查」「按主题查」路由 |

**与 api-spec 第十章差距**：

- api-spec 要求 Public 返回：标题、副标题、顶部展示区、**首页模块**、**高频事项**、**通知公告**、**主题样式**
- 当前 kiosk 仅消费标题区 + 高频事项 + 导航；政务公开模块、主题样式、通知公告区块 **未接 API**

### 1.4 管理端（admin-web）

| 项 | 现状 |
|---|---|
| 首页配置页面 | **不存在** |
| home 相关 API 客户端 | **不存在** |
| `DashboardView.vue` | 占位首页，无配置功能 |

### 1.5 发布模块（对照参照）

| 路径 | 现状 |
|---|---|
| `publish.service.ts` | 门面层，`assertBizType` 仅允许 `content` |
| `content-publish.service.ts` | 完整状态机：submit / approve / reject / direct-publish / withdraw / rollback |
| `publish_record` | 已建表，biz_type 设计支持多业务 |
| 测试 | `publish.spec.ts` 断言 `home_config` 返回 400 |

---

## 二、基线文档之间的不一致与歧义

### 2.1 `database.md` 内部不一致

| 问题 | 详情 |
|---|---|
| **缺版本表** | `home_config` 含 `current_version_id`，但文档 **未定义** `home_config_version`（或同类表） |
| **模块归属模糊** | `home_module.home_config_id` 指向主表，暗示 **当前态直接维护**；与 `current_version_id` 所暗示的 **版本快照模型** 矛盾 |
| **模块表字段不全** | `home_module` 无 `deleted_at`、无 `status`，与其他业务表（如 `guide_dept_mapping`）不一致 |
| **同类缺口** | `showcase_item` 也有 `current_version_id`，但文档同样 **无** `showcase_version` 表（首页配置非孤例） |

### 2.2 `database.md` ↔ `architecture.md`

| 一致 | 不一致 / 待澄清 |
|---|---|
| HomeConfigModule 职责（模块、顶部、排序、主题色） | architecture 要求 **审核发布 + 版本记录 + 回滚**；database 未给出版本表与模块快照方案 |
| 首页缓存由 CacheModule 负责 | 缓存键、失效时机、与发布联动 **未在 database/api-spec 细化** |
| GuideConfigModule 含「首页推荐」 | 与 HomeConfigModule「推荐内容」职责 **重叠**（高频事项来源未定） |

### 2.3 `database.md` ↔ `api-spec.md`

| 一致 | 不一致 / 待澄清 |
|---|---|
| Admin CRUD：`/api/admin/home/config`、`/modules`、`/sort` | api-spec **未定义** 响应/请求 JSON 结构（无 DTO 级字段表） |
| Public `GET /api/public/home/config` | api-spec 列了 7 类信息；database 字段（`top_banner_json`、`theme_json`）与 kiosk 现有 `AppConfig` **字段名不对齐** |
| `home_config` 为统一发布 `bizType` | api-spec **未定义** 首页配置的 submit/approve 是否走通用 `/api/admin/publish/home_config/:id/*` |
| 高频事项 | api-spec Public 含「高频事项」；database `home_module` 无 item 引用字段，mock 用 `homeHotItems` 数组 |

### 2.4 `architecture.md` / `CLAUDE.md` ↔ 现网代码

| 基线要求 | 代码现状 |
|---|---|
| 所有可发布内容支持版本管理（含 `home_config`） | Publish 仅 content；Home 仅 mock |
| 编辑创建新草稿，不覆盖已发布版本 | 无表、无版本 |
| 群众端 Public 只读已发布内容 | Public 返回写死 mock，无状态概念 |
| 每次发布写入 `publish_record` | home_config 未接入 |

### 2.5 群众端硬编码 ↔ api-spec 首页模块

| api-spec / architecture 首页模块 | kiosk 实现 |
|---|---|
| 高频事项、按部门查、按主题查、政策公开、窗口导航、FAQ、通知公告、模范先锋岗等 | 高频事项 ← API；部门/主题 ← 硬编码按钮；政务公开 9 模块 ← `modules.ts`；窗口导航/模范先锋岗 **未实现** |

---

## 三、推荐实体关系（实施导向）

### 3.1 核心原则

沿用已验证的 **content_item + content_version + publish_record** 模式，适配首页「单实例配置 + 多模块布局」特点。

```
home_config（主表，逻辑单行或具名实例）
  ├─ status（draft / pending / published / rejected / withdrawn）
  ├─ current_version_id → 当前生效的已发布版本
  └─ 元数据：config_name、created_by、updated_by、时间戳、deleted_at

home_config_version（版本表，只追加）
  ├─ home_config_id
  ├─ version_no
  ├─ status（draft / pending / published / rejected / withdrawn）
  ├─ title、subtitle
  ├─ top_banner_json（text，序列化 banner 行/富文本配置）
  ├─ theme_json（text，主题色/样式）
  ├─ modules_json（text，**模块列表快照**）
  ├─ hot_items_json（text，可选：首页高频事项引用快照）
  ├─ change_remark、created_by、created_at

publish_record（已有）
  └─ biz_type = 'home_config'，biz_id = home_config.id，version_id = home_config_version.id
```

### 3.2 是否需要新增 `home_config_version` 表？

**结论：需要。**

依据：

1. `home_config.current_version_id` 已在 `database.md` 定义，无版本表则该字段 **无落点**。
2. `CLAUDE.md` §6 明确要求 `home_config` 走版本管理，且 `content_version` 为参照实现。
3. `architecture.md` §8 要求版本记录与回滚；仅靠 `home_module` 当前态 **无法** 满足「草稿编辑不影响已发布首页」。
4. 现有 `ContentPublishService` 回滚逻辑是 **复制历史版本为新 draft**，必须有独立版本行。

### 3.3 `home_module` 应随版本快照，还是直接维护当前数据？

**结论：推荐「版本快照为主，运行态不直接维护模块表」。**

| 方案 | 评价 |
|---|---|
| A. `home_module` 长期挂 `home_config_id`，直接改当前数据 | ❌ 与发布/草稿隔离冲突；编辑即影响线上风险 |
| B. `home_module` 挂 `home_config_version_id`，仅 draft 版本可编辑 | ⚠️ 可行但需维护多版本平行模块行，复杂度高 |
| C. **模块列表序列化进 `home_config_version.modules_json`（text）** | ✅ 推荐：与 `top_banner_json`/`theme_json` 一致；发布即冻结快照；Public API 只读 published 版本 JSON |

**对 `database.md` 既有 `home_module` 表的处理建议**（需 Codex 确认是否修订基线）：

- **一期实现**：以 `modules_json` 快照为准，Admin 编辑在内存/草稿版本中完成，**可不建物理 `home_module` 表**，降低迁移复杂度；或建表但 **仅作为草稿编辑辅助**，发布时写入 `modules_json` 后不再依赖行级模块表。
- 若坚持保留 `home_module` 表：必须将 FK 改为 `home_config_version_id`，且 **禁止** 直接 FK 到 `home_config_id` 作为发布数据源。

### 3.4 高频事项（`homeHotItems`）来源

| 选项 | 说明 |
|---|---|
| **推荐（一期）** | 存入 `home_config_version.hot_items_json`（管理端配置 itemId + displayName 快照）；发布后不随 `guide_item_config` 实时变化 |
| 备选 | Public 层动态 join `guide_item_config`（`is_recommend`/`is_hot`） | 与「版本快照」原则冲突，且 guide 配置 **无发布状态机** |

architecture 将「首页推荐」列在 GuideConfigModule，与 HomeConfigModule「推荐内容」**职责重叠** — 一期建议 **首页展示以 home_config 版本快照为准**，guide 配置仅作编辑时候选数据源（Admin UI 拉取可选事项列表），**需 Codex 确认**。

---

## 四、发布 / 撤回 / 回滚时各表状态变化

假定 `home_config` 为单例（`id = HC-001`），操作均写 `publish_record`。

### 4.1 编辑（保存草稿）

| 表 | 变化 |
|---|---|
| `home_config` | `status` 保持 `draft` 或 `published`（若已有线上版本）；**不修改** `current_version_id` |
| `home_config_version` | 若无 draft：新建 `version_no+1`、`status=draft`、写入编辑后 JSON 快照；若已有 draft：**更新该 draft 行**（或按 content 模式禁止覆盖、强制新建 — 建议与 content 一致：仅最新 draft 可提交） |
| `publish_record` | 无 |

### 4.2 提交审核（submit）

| 表 | 变化 |
|---|---|
| `home_config_version`（目标 draft） | `draft → pending` |
| `home_config` | 若原 `draft/rejected`：`→ pending`；若已 `published`：主表可保持 `published`（与 content 类似，待审核版本并行） |
| `publish_record` | 写入 `action=submit` |

### 4.3 审核通过 / 直接发布（approve / direct-publish）

| 表 | 变化 |
|---|---|
| `home_config_version`（新版本） | `pending/draft → published`；旧 published 版本 `→ withdrawn` 或保留 `published` 历史（建议标记 `withdrawn` 表意「被新版本取代」） |
| `home_config` | `status → published`；`current_version_id = 新版本 id`；同步 `title/subtitle` 等展示用冗余字段（可选，与 content_item 一致） |
| `publish_record` | `action=approve` 或 `direct_publish` |

### 4.4 驳回（reject）

| 表 | 变化 |
|---|---|
| `home_config_version` | `pending → rejected` |
| `home_config` | 若无非 published 版本：`→ rejected`；若仍有 `current_version_id`：主表可保持 `published` |
| `publish_record` | `action=reject` |

### 4.5 撤回（withdraw）

| 表 | 变化 |
|---|---|
| `home_config` | `published → withdrawn`；`current_version_id = null`（或保留指针但 Public 按 status 拒绝 — **推荐 null + status 判断双保险**） |
| `home_config_version`（当前生效） | `published → withdrawn` |
| `publish_record` | `action=withdraw` |
| Public API | 返回 **安全默认配置** 或 503/空态（**禁止** 回退到 draft） |

### 4.6 回滚（rollback）

| 表 | 变化 |
|---|---|
| `home_config_version` | 从历史 `published` 版本 **复制** 内容新建一行 `draft`（`version_no+1`），不修改历史行 |
| `home_config` | 主表 `status` 保持 `published` 或变 `draft`（若回滚后需再走审核 — 建议与 content 一致：回滚产物为 **draft**，需再次发布） |
| `publish_record` | `action=rollback` |
| `current_version_id` | **回滚操作本身不切换线上**；需再次 approve/direct-publish 后才更新 |

---

## 五、群众端 Public API 如何保证只读已发布版本

### 5.1 读取规则（推荐）

```sql
-- 逻辑等价，标准 SQL，无 MySQL 专属函数
SELECT v.*
FROM home_config h
JOIN home_config_version v ON v.id = h.current_version_id
WHERE h.deleted_at IS NULL
  AND h.status = 'published'
  AND v.status = 'published'
LIMIT 1
```

附加约束：

- **禁止** 读取 `draft` / `pending` / `rejected` / `withdrawn` 版本
- `modules_json` / `hot_items_json` 反序列化后映射为 Public DTO
- 不返回 `created_by`、`version_no`、内部 id（除模块跳转必需的 `targetValue` 等业务字段）
- 无已发布配置时：返回 **文档化默认 DTO**（与现 mock 类似但标记 `fallback: true`）或明确错误码 — **需 Codex 确认**

### 5.2 与 kiosk 二次请求问题

当前 `App.vue` 与 `Home.vue` **各请求一次** `/api/public/home/config`。Step 14B 建议：

- 保持单接口，kiosk 改为 **Pinia 或 provide/inject 共享一次加载**（属 14B kiosk 子任务，非本阶段实现）

---

## 六、管理端编辑草稿时如何避免影响已发布首页

| 机制 | 说明 |
|---|---|
| 版本隔离 | 所有编辑写入 `status=draft` 的 `home_config_version`，不修改 `current_version_id` 指向的 published 行 |
| 主表指针不变 | `home_config.current_version_id` 仅在 publish 成功时更新 |
| 模块快照 | 草稿 `modules_json` 与已发布版本物理隔离（不同 version 行） |
| 并发控制 | 同时仅允许一个 `pending` 版本（复用 content 的 `assertNoPendingVersion` 模式） |
| 预览（可选 P1） | Admin 只读接口 `GET /api/admin/home/config/preview?versionId=` 读 draft，不影响 Public |

---

## 七、MySQL 8 与 HighGo 兼容性检查

| 检查项 | 首页配置方案 | 结论 |
|---|---|---|
| 主键 `varchar(36)` + UUID v4 | 全表适用 | ✅ |
| 禁止自增 | `version_no` 用 int 递增由应用分配 | ✅ |
| 禁止 ENUM | `status` 用 `varchar(20)` | ✅ |
| JSON 用 `text` | `top_banner_json`、`theme_json`、`modules_json`、`hot_items_json` | ✅ |
| 公共时间字段 | `home_config` 含 `created_at/updated_at/deleted_at`；版本表至少 `created_at` | ✅ |
| 逻辑删除 | 主表 `deleted_at`；版本表只追加不物理删 | ✅ |
| 禁止触发器/存储过程 | 状态机全在 Service 层 | ✅ |
| 标准 SQL | JOIN + LIMIT + 标准聚合；排序用 `sort_order` 在 JSON 内由应用解析 | ✅ |
| 索引 | `idx_home_config_version_config_id`、`uk_config_version_no` 与 content 对齐 | ✅ 建议 |

**风险点**：`modules_json` 较大时需注意单行 text 体积；一期模块数量有限（<20），可接受。

---

## 八、推荐分阶段实施顺序

| 阶段 | 内容 | 依赖 |
|---|---|---|
| **14B-1** | 基线确认：Codex 审查本报告，必要时 **修订** `database.md`（增 `home_config_version`、明确 `home_module` 去留） | 本报告 |
| **14B-2** | Entity + Migration：`home_config`、`home_config_version`；权限 seed | 14B-1 |
| **14B-3** | `HomeConfigService` 草稿 CRUD + 版本读写；Admin API `/api/admin/home/*` | 14B-2 |
| **14B-4** | `HomeConfigPublishService` + 扩展 `PublishService` 支持 `home_config` | 14B-3 |
| **14B-5** | Public `GET /api/public/home/config` 读已发布版本；移除硬编码 mock | 14B-4 |
| **14B-6** | admin-web 首页配置页（基础信息 + 模块排序 + 高频事项 + 发布流） | 14B-4 |
| **14B-7** | kiosk-app 对接完整 Public DTO（模块卡片 API 化、共享单次加载） | 14B-5 |
| **14B-8** | 测试：发布状态机、Public 隔离、权限、回归 | 14B-5–7 |
| **14C（P1）** | CacheModule 首页缓存、offline-package 纳入 home config | 14B-8 |

**明确不在一期**：AI、预约、办件查询、扫码、打印、设备管理。

---

## 九、预计新增或修改文件清单（Step 14B 参考）

### 9.1 后端 — 新增

| 文件 | 用途 |
|---|---|
| `database/entities/home-config.entity.ts` | 主表 |
| `database/entities/home-config-version.entity.ts` | 版本表 |
| `database/migrations/*CreateHomeConfigTables.ts` | 建表 |
| `database/migrations/*SeedHomeConfigPermissions.ts` | 权限 |
| `home-config/dto/*.ts` | Admin/Public DTO |
| `home-config/home-config.service.ts` | 重写：草稿/版本/查询 |
| `home-config/home-config-publish.service.ts` | 发布状态机 |
| `publish/home-config-publish.service.ts` 或扩展现有 Publish | 接入统一 publish |
| `admin-api/controllers/home-config.controller.ts` | Admin 路由 |
| `test/home-config.spec.ts` | 单元/集成测试 |
| `test/home-config-publish.spec.ts` | 发布流测试 |

### 9.2 后端 — 修改

| 文件 | 变更 |
|---|---|
| `home-config/home-config.module.ts` | 注册 TypeORM、依赖 Publish |
| `publish/publish.service.ts` | 支持 `home_config` bizType |
| `publish/constants/publish.constants.ts` | 扩展 `SUPPORTED_BIZ_TYPES` |
| `publish/publish.module.ts` | 导入 HomeConfig 依赖 |
| `admin-api/admin-api.module.ts` | 注册 Home 控制器 |
| `database/database-config.factory.ts` | 注册新 Entity |

### 9.3 admin-web — 新增/修改（14B-6）

| 文件 | 用途 |
|---|---|
| `src/api/home/*.ts` | API 客户端 |
| `src/pages/home/HomeConfigView.vue` | 配置编辑 |
| `src/router/*` | 路由与权限 |
| `tests/home*.spec.ts` | 页面测试 |

### 9.4 kiosk-app — 修改（14B-7）

| 文件 | 变更 |
|---|---|
| `src/api/types.ts` | 扩展 `AppConfig`（modules、theme） |
| `src/pages/Home.vue` | 模块 API 化，去除部分硬编码 |
| `src/App.vue` | 配置单次加载共享 |
| `src/content/modules.ts` | 缩减或改为 API 驱动（**需 Codex 确认范围**） |
| `tests/*` | Public 契约测试 |

### 9.5 文档（14B 交付时）

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/046-step14b-home-config-*.md` | 实现交付报告 |
| 基线文档修订 | 建议由 Codex 更新 `database.md` 增补版本表（本阶段未改） |

---

## 十、测试计划与验收标准

### 10.1 后端测试

| 类别 | 用例 |
|---|---|
| 迁移 | 表结构、索引、权限 seed、MySQL/HighGo 方言 smoke |
| 草稿编辑 | 新建/更新 draft 不改变 `current_version_id` |
| 发布流 | submit / approve / reject / direct-publish / withdraw / rollback 全链路 |
| 隔离 | Public 不返回 draft/pending；withdraw 后 Public 无旧版内容 |
| 权限 | 无 JWT 拒绝 Admin；无权限码拒绝写操作 |
| 回归 | `publish.spec.ts` content 用例不退化；`home_config` bizType 不再 400 |

### 10.2 admin-web 测试

| 类别 | 用例 |
|---|---|
| 表单 | 编辑标题、模块排序、高频事项保存为 draft |
| 发布 | 提交审核、驳回、发布、撤回 UI 与接口一致 |
| 权限 | 不同角色可见/可操作范围 |

### 10.3 kiosk-app 测试

| 类别 | 用例 |
|---|---|
| 契约 | Public 响应映射；fallback 不白屏 |
| 行为 | 模块点击路由正确；零键盘不退化 |
| 性能 | 首页配置请求次数（避免 App/Home 重复） |

### 10.4 验收标准（Step 14 整体）

1. 管理端可配置首页并走完整审核发布流程，每次操作有 `publish_record`。
2. 群众端仅展示 `published` + `current_version_id` 对应版本。
3. 草稿/待审核编辑 **不影响** 当前已发布首页。
4. 撤回后群众端不展示被撤回内容。
5. 回滚产生新 draft，需再次发布方生效。
6. 无自增主键、无 ENUM、无 DB JSON 类型、无触发器。
7. 不操作 `oms_db`；迁移仅在 `touch_kiosk_dev` 由用户/Codex 执行。
8. 远程若仅空配置，如实记录空态，不伪造业务数据。

---

## 十一、需 Codex 审查确认后方可进入实现的事项

| # | 事项 | 影响 |
|---|---|---|
| 1 | **是否修订 `database.md`**：新增 `home_config_version` 表定义；明确 `home_module` 去留或改为 `version_id` FK | 迁移设计 |
| 2 | **`home_config` 是否单例**：一期是否仅一条 `config_name='default'` | Admin UI 与查询逻辑 |
| 3 | **模块存储方案**：`modules_json` 快照 vs 保留 `home_module` 物理表 | 表结构与编辑体验 |
| 4 | **高频事项来源**：版本内 `hot_items_json` 快照 vs 运行时查 `guide_item_config` | Public API 稳定性 |
| 5 | **政务公开 9 模块**：迁移到 API `modules` 还是一期保持 kiosk 硬编码 | kiosk 改动范围 |
| 6 | **withdraw 后 Public 降级策略**：默认 mock / 最小安全 DTO / 503 | 群众端体验 |
| 7 | **rollback 是否需再次审核**：建议与 content 一致（回滚→draft→再发布） | 发布权限流程 |
| 8 | **`showcase_item` 版本表**是否同期补齐 | 范围控制（可延期） |
| 9 | **权限码命名**：`home:config:read` 等是否与现有 seed 风格一致 | RBAC |
| 10 | **offline-package / CacheModule** 是否纳入 14B 或延后 P1 | 排期 |

---

## 十二、审查结论（设计核对）

| 维度 | 结论 |
|---|---|
| 现网就绪度 | **未就绪**：无表、无 Admin、Publish 拒绝、Public 硬编码 |
| 基线一致性 | **存在显著歧义**：缺版本表、模块归属不清、kiosk 与 api-spec 字段差距 |
| 推荐方案 | **新增 `home_config_version` + 版本内 JSON 快照 + 扩展 PublishModule** |
| 可否直接进入 14B 编码 | **不建议**，至少需 Codex 确认 §十一第 1–5 项 |

---

## 十三、远程验证说明（本阶段）

本阶段无远程业务变更。参考 Step 13/044 结论：

- `http://10.217.19.22:5183/` SPA 可访问
- `GET /api/public/home/config` 仍返回 **硬编码 mock**
- 远程完整首页配置验收 **尚不可行**，因后端无真实配置数据与管理端

---

**Step 14A 完成。等待 Codex 审查确认后，方可启动 Step 14B 实现。**
