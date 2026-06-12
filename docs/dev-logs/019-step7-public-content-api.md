# 019 · Step 7 群众端政务公开 Public Content API 第一期

**交付日期**：2026-06-12  
**基于**：018-step6-publish-review-anomaly-closure.md  
**状态**：✅ 完成

---

## 一、任务目标

实现群众端只读政务公开内容接口（`/api/public/content/*`），确保仅返回已发布内容及其 `current_version_id` 指向的 `published` 版本。

---

## 二、修改文件清单

### 新增

| 文件 | 说明 |
|---|---|
| `backend/src/content/constants/public-content-routes.ts` | 路由 ↔ contentType 集中映射 |
| `backend/src/content/dto/public-content-list-query.dto.ts` | 列表查询（page/pageSize/categoryId） |
| `backend/src/content/types/public-content.types.ts` | Public DTO 类型定义 |
| `backend/src/content/public-content.service.ts` | 只读公开查询服务 |
| `backend/src/public-api/controllers/public-content.controller.ts` | 14 个群众端接口 |
| `backend/test/public-content.spec.ts` | 单元 + HTTP 测试 |
| `backend/test/public-content-mysql-integration.spec.ts` | 真实 MySQL 发布链路测试 |

### 修改

| 文件 | 说明 |
|---|---|
| `backend/src/content/content.module.ts` | 注册并导出 `PublicContentService` |
| `backend/src/public-api/public-api.module.ts` | 引入 ContentModule + PublicContentController |
| `backend/package.json` | 串行集成增加 public-content 套件 |
| `CLAUDE.md` | Step 7 开发状态 |

---

## 三、路由与 contentType 映射

| 路由段 | contentType | 详情 |
|---|---|---|
| `policies` | `policy_file` | ✅ |
| `interpretations` | `policy_interpretation` | ✅ |
| `open-guide` | `open_guide` | 仅列表 |
| `open-system` | `open_system` | 仅列表 |
| `open-catalog` | `open_catalog` | 仅列表 |
| `annual-reports` | `annual_report` | 仅列表 |
| `organizations` | `organization` | ✅ |
| `faqs` | `faq` | ✅ |
| `notices` | `notice` | ✅ |

映射维护于 `PUBLIC_CONTENT_ROUTES`，Controller 通过 `getPublicContentRouteOrFail` 引用，禁止分散硬编码。

---

## 四、Public DTO 字段清单

### 列表项 / 详情公共字段

- `id`
- `contentType`
- `title`
- `subtitle`
- `summary`
- `categoryId`
- `coverFileId`
- `publishAt`
- `sourceType`
- `sourceUrl`

### 详情额外字段

- `body`（**仅**来自 `current_version_id` 关联的 `content_version.body`）

### 不返回（已排除）

`currentVersionId`、`versionNo`、`status`、`createdBy`、`updatedBy`、`deletedAt`、`changeRemark`、`extraJson`、`isTop`、`isRecommend`、`sortOrder` 等后台字段。

---

## 五、发布内容过滤规则

查询通过 `content_item` INNER JOIN `content_version`（`current_version_id`）实现，须同时满足：

1. `content_item.status = published`
2. `content_item.deleted_at IS NULL`（TypeORM 软删除自动过滤）
3. `content_item.current_version_id IS NOT NULL`
4. `content_version.status = published`（关联版本）
5. `content_item.content_type` 与路由映射一致

不存在、未发布、已撤回、类型不匹配、版本异常等详情统一 **404**，不泄露资源是否存在。

### 排序（稳定）

`is_top DESC` → `sort_order ASC` → `publish_at DESC` → `id ASC`

### 分页

统一返回 `list`、`total`、`page`、`pageSize`。

---

## 六、核心业务链路验证结果（`touch_kiosk_test`）

| 步骤 | 结果 |
|---|---|
| 创建草稿 | Public 列表空、详情 404 | ✅ |
| 提交审核 → 审核发布 | Public 可查询，正文来自 v1 | ✅ |
| 编辑产生新草稿 | Public 仍展示 v1 标题/正文 | ✅ |
| 新版本审核发布 | Public 切换至 v2 | ✅ |
| 撤回 | Public 详情 404、列表不含该项 | ✅ |
| FAQ 发布后用 policies 路由查 | 404（类型不匹配） | ✅ |
| current_version_id 为空 / 版本非 published | 404 | ✅ |
| 软删除已发布内容 | 404 | ✅ |

---

## 七、测试实际通过数

| 套件 | 通过 | 跳过 |
|---|---|---|
| 单元/静态（`npm test -- --runInBand`） | **341** | **35**（6 个 MySQL 集成套件） |
| 串行 MySQL 集成（`test:integration:mysql:serial`） | **35** | 0 |
| **合计（全量串行验证后）** | **376** | 0 |

新增测试覆盖：路由映射、published 过滤、版本约束、Public DTO 字段、分页排序、未登录访问、管理端 401 不受影响、MySQL 全链路。

---

## 八、已执行验证命令

```bash
cd backend
npm run type-check                    # ✅
npm run build                         # ✅
npm test -- --runInBand               # ✅ 341 passed, 35 skipped
npm run test:integration:mysql:serial # ✅ 35 passed
```

---

## 九、数据库访问确认

| 项 | 结论 |
|---|---|
| 测试库 | 仅 `backend/.env` 中 `MYSQL_TEST_*` → `touch_kiosk_test` |
| `oms_db` / `mydb` | **未访问** |
| 建库/删库/授权/迁移 | **未执行** |
| `touch_kiosk_test_guard` | **未修改** |
| 密码/凭据 | 报告中 **未记录** |

---

## 十、未完成事项与风险

| 项 | 说明 |
|---|---|
| kiosk-app 对接 | 本阶段未修改群众端，需后续接入新接口 |
| admin-web | 未改动 |
| 文本搜索 | 未实现（二期） |
| categoryId 筛选 | 已实现；分类树公开接口未在本期范围 |
| HighGo 实连 | 查询为标准 SQL JOIN，未在真实 HighGo 复跑 |
| 关联内容 / 相关推荐 | `content_relation` 未在 Public API 暴露 |

---

## 十一、下一步建议

1. kiosk-app 政策/解读/公告等页面接入 `/api/public/content/*`。
2. 视需要补充公开分类树接口（只读 published 内容关联分类）。
3. Public 文件访问 `GET /api/public/files/:id` 与封面图联调。
