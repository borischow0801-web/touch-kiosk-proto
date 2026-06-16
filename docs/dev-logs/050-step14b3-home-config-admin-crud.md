# 050 · Step 14B-3 首页配置后端草稿与模块 CRUD

**交付日期**：2026-06-16  
**基于**：049-step14b2a-home-config-migration-test-closure.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

实现 `HomeConfigModule` 管理端业务基础：配置读取、PUT 隐式草稿、模块 CRUD/排序、权限校验。**未实现** 发布适配器、Public 真实查询、前端改造。

**未修改**：admin-web、kiosk-app、deploy、基线文档、环境配置。  
**未连接或操作**任何数据库。

---

## 二、修改文件清单

### 业务代码

| 文件 | 说明 |
|---|---|
| `backend/src/home-config/home-config.service.ts` | 核心服务（保留 `getPublicConfig` mock） |
| `backend/src/home-config/home-config.module.ts` | 注册 3 个 Entity Repository |
| `backend/src/home-config/dto/*.ts` | 配置/模块 DTO |
| `backend/src/admin-api/controllers/home-config.controller.ts` | GET/PUT 配置 |
| `backend/src/admin-api/controllers/home-modules.controller.ts` | 模块 CRUD + sort |
| `backend/src/admin-api/admin-api.module.ts` | 注册 Controller + HomeConfigModule |

### 测试

| 文件 | 说明 |
|---|---|
| `backend/test/home-config.service.spec.ts` | Service 单元测试（13 用例） |
| `backend/test/admin-home-config.spec.ts` | HTTP 集成测试（10 用例） |

### 交付报告

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/050-step14b3-home-config-admin-crud.md` | 本报告 |

---

## 三、实现的接口清单

| 方法 | 路径 | 权限 |
|---|---|---|
| GET | `/api/admin/home/config` | `home:config:read` |
| PUT | `/api/admin/home/config` | `home:config:update` |
| GET | `/api/admin/home/modules` | `home:module:read` |
| POST | `/api/admin/home/modules` | `home:module:create` |
| PUT | `/api/admin/home/modules/sort` | `home:module:sort` |
| PUT | `/api/admin/home/modules/:id` | `home:module:update` |
| DELETE | `/api/admin/home/modules/:id` | `home:module:delete` |

`PUT /modules/sort` 路由注册在 `PUT /modules/:id` **之前**，避免 `sort` 被当作 id。

---

## 四、草稿创建规则实现说明

`PUT /api/admin/home/config` 为唯一基础配置编辑入口：

| 条件 | 行为 |
|---|---|
| 存在 `pending` 版本 | **409** |
| 无主表 | 事务内创建主表（`status=draft`）+ `versionNo=1` draft |
| 有 `draft` | 更新该 draft 正文（title/subtitle/topBannerJson/themeJson） |
| 无 `draft` 且有 `currentVersionId` | 复制已发布版本 **及模块** → 新 draft → 应用更新；主表 **保持** `published`/`withdrawn` |
| `withdrawn` 主表 | 创建 draft 后主表 **仍** `withdrawn` |

约束：

- 不修改 `currentVersionId`
- 已发布版本正文不被原地覆盖
- `topBannerJson`/`themeJson` 序列化为 text 存储

`GET /api/admin/home/config`：无主表时返回空状态（`id=null`），**不**自动创建。

---

## 五、模块 CRUD 与排序说明

- 写操作仅作用于当前 **`draft`** 版本
- 无 `draft` 或存在 `pending` 且无 `draft` → **409**
- `DELETE` 写 `deleted_at`；列表过滤已删除模块
- `moduleCode` 在 draft 版本内由服务层查重（**409**），不用数据库部分唯一索引
- `sort` 批量更新 `sortOrder`，`items` 不得为空

响应 DTO 不含 `createdBy`、`updatedBy`、`homeConfigVersionId`、`deletedAt` 等内部字段。

---

## 六、权限说明

- 全局 `JwtAuthGuard` + `PermissionsGuard`（与 content/guide 一致）
- 各接口 `@RequirePermissions` 对应 api-spec 权限码
- `SUPER_ADMIN` 通配 `['*']` 可访问全部接口

---

## 七、测试结果

```bash
git diff --check backend/
cd backend && npm test -- --runInBand
```

| 指标 | 结果 |
|---|---|
| `git diff --check` | ✅ 通过 |
| Test Suites | **33 passed**, 6 skipped |
| Tests | **613 passed**, 35 skipped |
| 新增 | `home-config.service.spec.ts` 13/13；`admin-home-config.spec.ts` 10/10 |
| content / guide / publish 回归 | ✅ 无退化 |

**跳过说明**：6 个 skipped 为需真实 MySQL 的集成测试。

**PublishService**：仍不支持 `home_config`（本阶段未伪装完成）。

---

## 八、声明

- **未实现** `PublishService` 对 `home_config` 的 submit/approve/publish/withdraw/rollback
- **未实现** `GET /api/public/home/config` 真实数据库查询（仍用 `getPublicConfig()` mock）
- **未修改** admin-web、kiosk-app、deploy
- **未连接或操作**任何数据库实例

---

## 九、下一步（14B-4）

1. 实现 `HomeConfigPublishService` 或等价适配器
2. 扩展 `PublishService` 支持 `bizType=home_config`
3. 实现 Public Home API 组合查询（已发布版本 + 模块 + 高频事项 + 通知摘要）
