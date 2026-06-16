# 047 · Step 14B-1A 首页配置基线最终收口

**交付日期**：2026-06-15  
**基于**：046-step14b1-home-config-baseline-alignment.md  
**执行方**：Cursor  
**状态**：通过（纯文档收口，待审查通过后进入 14B-2）

---

## 一、执行范围

本阶段在 14B-1 基线统一基础上，消除状态机、草稿创建、503 语义与 API 文案残留歧义。**仅修订文档**，不进入 Entity、Migration 或业务代码。

**实际修改文件**：

| 文件 | 变更 |
|---|---|
| `docs/database.md` | 主表状态机、版本可编辑性、草稿唯一入口、503、单例事务约束 |
| `docs/architecture.md` | §6 Public 503、§8 首页发布完整状态机与路由顺序 |
| `docs/api-spec.md` | 删除 draft POST、PUT 规则、模块路由顺序、状态机表、HTTP 503 |
| `docs/dev-logs/046-step14b1-home-config-baseline-alignment.md` | 交付日期修正为 2026-06-15；标注 047 收口 |
| `docs/dev-logs/047-step14b1a-home-config-baseline-closure.md` | 本报告 |

**未修改**：`backend/`、`admin-web/`、`kiosk-app/`、`deploy/`、`CLAUDE.md`、任何迁移与环境配置。  
**未连接或操作**任何数据库。

---

## 二、修正的歧义

| # | 14B-1 残留歧义 | 14B-1A 确定口径 |
|---|---|---|
| 1 | `POST /api/admin/home/config/draft` 可选显式接口 | **删除**；`PUT /api/admin/home/config` 为唯一基础配置编辑入口 |
| 2 | 草稿创建时机与复制源未写死 | 四条规则表（有 draft 更新 / 无 draft 复制 current / 首次建主表+v1 / pending→409） |
| 3 | 主表 `status` 在「线上已发布 + 并行草稿/审核」时行为不清 | 有 `current_version_id` 时，隐式建草稿、提交、驳回均 **保持 `published`** |
| 4 | `withdrawn` 后编辑期间主表状态 | 创建/提交/驳回期间 **保持 `withdrawn`**，直至新版本发布 |
| 5 | 回滚对主表的影响 | 回滚 **仅** 创建新 `draft`，**不改变** 主表 `status` 与 `current_version_id` |
| 6 | 版本正文何时可改 | 仅 `draft` 可编辑正文与模块；其余状态仅允许 `status` 流转 |
| 7 | draft/pending 并发 | 同一配置最多 **一个 draft + 一个 pending** |
| 8 | 无发布时 HTTP 语义 | **HTTP 503** + 信封 `code=503` + `data=null`（非 HTTP 200） |
| 9 | Admin 响应字段边界 | 明确不返回 `createdBy`、`updatedBy`、凭据、权限、内部库字段 |
| 10 | `config_name=default` 单例 | **应用层事务** 保证；不用部分唯一索引；不用方言专属约束 |
| 11 | `/modules/sort` 路由 | 必须 **优先于** `/modules/:id` 注册或匹配 |

---

## 三、最终草稿创建规则

**唯一入口**：`PUT /api/admin/home/config`

| 条件 | 行为 |
|---|---|
| 已存在 `draft` | 更新该 `draft` 正文（title / subtitle / topBannerJson / themeJson / changeRemark） |
| 不存在 `draft` 且存在 `current_version_id` | 事务内复制当前已发布版本 **及其 `home_module` 行** → 新 `draft` → 应用本次更新；主表保持 `published` |
| 首次使用（主表不存在） | 事务内创建 UUID 主表（`status=draft`）+ `version_no=1` 的 `draft` → 应用更新 |
| 已存在 `pending` 版本 | **409**，禁止创建或编辑 `draft` |

模块 CRUD / 排序同样仅针对当前 `draft`；存在 `pending` 且无 `draft` 时，模块写操作返回 **409**。

---

## 四、最终状态机

### 4.1 主表（home_config）

| 场景 | status | current_version_id |
|---|---|---|
| 首次 `PUT` 创建草稿 | `draft` | 空 |
| 无已发布版本时保存草稿 | `draft` | 空 |
| 无已发布版本时提交审核 | `draft`/`rejected` → `pending` | 不变 |
| 有 `current_version_id`：隐式建草稿 / 保存 / 提交 / 驳回 | **`published`** | 不变 |
| 审核通过或直接发布 | `published` | 更新为新版本 id |
| 撤回 | `withdrawn` | **清空** |
| `withdrawn` 下建草稿 / 提交 / 驳回 | **`withdrawn`** | 不变 |
| 从 `withdrawn` 发布成功 | `published` | 更新为新版本 id |
| 回滚 | **不变** | **不变** |

### 4.2 版本（home_config_version）

| 规则 | 说明 |
|---|---|
| 可编辑 | 仅 `draft` 正文与模块 |
| 不可编辑 | `pending` / `published` / `rejected` / `withdrawn` / `archived` 正文与模块；仅 `status` 可流转 |
| 历史 | 不得删除或覆盖 |
| 并发 | 最多 1 个 `draft` + 1 个 `pending` |
| 发布 | 目标版本 → `published`；历史 `published` **保留** |
| 撤回 | 当前生效版本 → `withdrawn` |
| 回滚 | 复制历史版本+模块 → 新 `draft` |

### 4.3 三文档对齐

`database.md` §六状态表、`architecture.md` §8、`api-spec.md` §十发布语义 **表述一致**。

---

## 五、503 响应规则

触发条件：不存在满足条件的已发布首页配置（`status≠published`、`current_version_id` 为空或无效等）。

| 层 | 值 |
|---|---|
| HTTP 状态码 | **503** |
| 响应信封 `code` | **503** |
| `data` | `null` |
| `message` | 服务暂不可用类友好文案 |

群众端捕获 HTTP 503 或信封 `code=503` 后使用 **本地离线配置** 兜底。  
**禁止** 返回开发 mock 或示例政务事项。

---

## 六、兼容性检查

| 检查项 | 结果 |
|---|---|
| 主键 UUID `varchar(36)` | ✅ |
| 禁止自增主键 | ✅ `version_no` 应用分配 |
| 禁止数据库 ENUM | ✅ |
| 禁止数据库 JSON 类型 | ✅ `text` 语义 |
| 禁止触发器 / 存储过程 | ✅ |
| 禁止部分唯一索引 / 方言专属约束 | ✅ 单例由应用事务保证 |
| 文档无具体 SQL | ✅ |
| 三文档状态机一致 | ✅ |
| 三文档 503 一致 | ✅ |

---

## 七、验证结果

| 验证项 | 结果 |
|---|---|
| `git diff --check`（本阶段文件） | ✅ 无空白错误 |
| 本阶段修改范围 | ✅ 仅允许的五份文档 |
| backend / admin-web / kiosk-app / deploy | ✅ **本阶段未修改** |
| `npm` 测试 / 构建 | ⏭ **未运行** — 纯文档任务 |

---

## 八、声明

- **未修改** 任何业务代码。
- **未创建** Entity、Migration 或环境配置。
- **未连接或操作** 任何数据库实例。
- **未进入** Step 14B-2；待本轮审查通过后再开始编码。

---

## 九、下一步（14B-2，审查通过后）

1. `home_config` / `home_config_version` / `home_module` Entity + Migration  
2. 权限 seed（`home:config:*`、`home:module:*`）  
3. `HomeConfigService` 实现 PUT 隐式草稿、状态机与 `PublishService` 适配器  
