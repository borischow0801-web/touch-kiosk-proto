# 053 · Step 14B-5 Public Home API 真实组合查询

**交付日期**：2026-06-16  
**基于**：052-step14b4-home-config-publish-adapter.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

将 `GET /api/public/home/config` 从硬编码 mock 改为真实数据库组合查询。

**已实现**：`PublicHomeConfigService`、Controller 切换、单元与 HTTP 测试。

**未实现**：admin-web 页面、kiosk-app 改造、offline-package、系统参数 nav 迁移。

**未修改**：admin-web、kiosk-app、deploy、`docs/database.md`、`docs/architecture.md`、`docs/api-spec.md`、`CLAUDE.md`、Entity、Migration、环境配置。

**未连接或操作**任何数据库。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `backend/src/home-config/public-home-config.service.ts` | **新增** 群众端首页组合查询服务 |
| `backend/src/home-config/types/public-home-config.types.ts` | **新增** 响应类型与常量 |
| `backend/src/home-config/home-config.module.ts` | 注册 GuideItemConfig、ContentItem/Version；导出 PublicHomeConfigService |
| `backend/src/home-config/home-config.service.ts` | 移除 `getPublicConfig()` mock |
| `backend/src/public-api/controllers/home.controller.ts` | 注入 PublicHomeConfigService |
| `backend/test/public-home-config.spec.ts` | **新增** Service 单元 + HTTP 测试（17 用例） |
| `backend/test/admin-home-config.spec.ts` | 移除 mock 中已废弃的 getPublicConfig |
| `docs/dev-logs/053-step14b5-public-home-config.md` | 本报告 |

`public-api.module.ts` 无需改动，已通过 HomeConfigModule 导入。

---

## 三、Public Home API 查询规则

### 首页配置（home_config + home_config_version）

1. 读取 `home_config.config_name = 'default'`
2. 要求 `home_config.status = published`
3. 要求 `current_version_id` 非空
4. 读取对应 `home_config_version`，要求 `status = published`
5. 返回 `title`、`subtitle`；解析 `top_banner_json` → `bannerLines`；解析 `theme_json` → `theme`

### 模块（home_module）

- 归属当前发布版本
- `is_visible = 1` 且未逻辑删除（TypeORM 软删除自动过滤）
- 排序：`sort_order ASC`、`created_at ASC`
- 返回：moduleCode、moduleName、moduleType、icon、color、layoutType、targetType、targetValue

### 高频事项（guide_item_config）

- `is_visible = 1` 且未逻辑删除
- `is_hot = 1` OR `is_recommend = 1`
- 排序：`sort_order ASC`、`created_at ASC`
- 返回：itemId（platform_item_id）、name（display_name 优先，否则 item_name）

### 通知公告摘要（content_item + content_version）

- `content_type = notices`、`status = published`、`current_version_id` 有效
- 关联版本 `status = published`
- title、summary 来自当前 published 版本
- 最多 5 条；排序：`publish_at DESC`、`updated_at DESC`
- 返回：id、title、summary、publishAt

---

## 四、503 兜底规则

以下任一条件不满足时抛出 `ServiceUnavailableException`：

- 无 `home_config` 记录
- 主表非 `published`
- `current_version_id` 为空
- 指向的版本不存在或非 `published`

HTTP 表现（经 `HttpExceptionFilter`）：

| 字段 | 值 |
|---|---|
| HTTP 状态码 | 503 |
| 信封 `code` | 503 |
| `message` | 首页配置暂不可用，请稍后再试 |
| `data` | `null` |

**禁止**返回开发 mock 或示例政务事项。

---

## 五、响应字段说明

成功时 `data` 结构：

| 字段 | 来源 / 说明 |
|---|---|
| title | 已发布版本 title |
| subtitle | 已发布版本 subtitle |
| idleSeconds | 固定默认 90 |
| bannerLines | `top_banner_json` 解析为 string[] |
| theme | `theme_json` 解析为 object |
| modules | 当前版本可见模块 |
| homeHotItems | guide_item_config 高频/推荐事项 |
| noticeSummaries | 已发布 notices 摘要（≤5） |
| nav | 固定安全导航（首页/返回/重来/帮助） |

**不返回**：createdBy、updatedBy、deletedAt、homeConfigVersionId、body、deptCode、themeCode、relatedPolicyIds 等内部字段。

### JSON 解析容错

| 字段 | 解析失败行为 |
|---|---|
| top_banner_json | 记录 warn 日志，返回 `[]` |
| theme_json | 记录 warn 日志，返回 `{}` |

---

## 六、高频事项与通知公告组合说明

两者与首页配置 **并行查询**（`Promise.all`），互不影响：

- 首页配置不可用 → 整体 503（不返回部分数据）
- 首页配置可用但高频事项/通知为空 → 仍 200，对应数组为空

通知公告查询复用与 `PublicContentService` 一致的 published 版本 JOIN 模式，确保只读已发布内容。

---

## 七、测试结果

```bash
git diff --check          # 通过
cd backend && npm test -- --runInBand
# Test Suites: 35 passed
# Tests:       656 passed
```

### PublicHomeConfigService（14 用例）

- 无配置 / 非 published / 无 currentVersionId / 版本非 published → 503
- 成功返回 title/subtitle
- 只返回可见模块；不含内部字段
- bannerLines / theme 正常解析与非法 JSON 容错
- homeHotItems 过滤规则
- noticeSummaries 最多 5 条
- nav 固定值

### HTTP（3 用例）

- 无需 token
- 无已发布配置 → 503，code=503，data=null
- 有已发布配置 → 200，code=0

### 回归

- Admin Home CRUD、HomeConfigPublish、Content、Guide、Publish 测试全部通过

---

## 八、声明

- **未修改** admin-web、kiosk-app、deploy、基线文档、Entity、Migration、环境配置
- **未连接或操作**任何数据库；全部测试使用 mock Repository

---

## 九、下一步建议

**Step 14B-6**：管理端首页配置页面（admin-web）

或先进行一次 **后端真实迁移环境验收**：

- 在开发环境执行 home_config 相关迁移
- 通过 Admin API 创建并发布首页配置
- 验证 `GET /api/public/home/config` 返回真实组合数据
- 验证无发布时 503 与 kiosk-app 离线兜底衔接
