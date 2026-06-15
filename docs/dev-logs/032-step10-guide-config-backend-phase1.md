# 032 · Step 10 办事指南配置后端 Phase 1

**交付日期**：2026-06-12  
**基于**：031-step9-admin-content-publish-matrix-closure.md  
**状态**：✅ 完成（仅 backend；未实现 guide_item_config、共享平台真实调用、群众端事项查询、管理端页面）

---

## 一、数据表与字段映射

### guide_dept_mapping

| 数据库列 | 实体字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | varchar(36) | UUID v4，非自增 |
| `dept_name` | `deptName` | varchar(100) | 部门名称 |
| `dept_code` | `deptCode` | varchar(50) | 部门编码（创建后不可改） |
| `display_name` | `displayName` | varchar(100) | 展示名称 |
| `icon` | `icon` | varchar(255) nullable | 图标 |
| `floor_text` | `floorText` | varchar(100) nullable | 楼层文案 |
| `area_text` | `areaText` | varchar(100) nullable | 区域文案 |
| `is_visible` | `isVisible` | smallint 0/1 | 是否展示 |
| `sort_order` | `sortOrder` | int | 排序 |
| `status` | `status` | varchar(20) | 默认 `active` |
| `created_at` / `updated_at` / `deleted_at` | 基类 | timestamp | 逻辑删除 |

### guide_theme_mapping

| 数据库列 | 实体字段 | 类型 | 说明 |
|---|---|---|---|
| `id` | `id` | varchar(36) | UUID v4，非自增 |
| `theme_name` | `themeName` | varchar(100) | 主题名称 |
| `theme_code` | `themeCode` | varchar(50) | 主题编码（创建后不可改） |
| `platform_param_json` | `platformParamJson` | **text** nullable | 共享平台参数 JSON 字符串 |
| `icon` | `icon` | varchar(255) nullable | 图标 |
| `is_visible` | `isVisible` | smallint 0/1 | 是否展示 |
| `sort_order` | `sortOrder` | int | 排序 |
| `created_at` / `updated_at` / `deleted_at` | 基类 | timestamp | 逻辑删除（无 status 列） |

---

## 二、MySQL / HighGo 兼容性

- 迁移使用 TypeORM `Table` / `TableIndex` API，无 `queryRunner.query`、无 `ENGINE`/`CHARSET`/`ENUM`/`JSON` 类型。
- 主键 `varchar(36)`，无自增；`is_visible` 使用 `smallint`（非 tinyint）。
- `platform_param_json` 存 `text`，DTO 层 `@IsJsonString()` 校验合法 JSON 字符串。
- **编码唯一性**：未建数据库级 UNIQUE（避免软删除行阻塞同编码重建）；服务层对**未删除**记录查重，重复返回 409；`dept_code`/`theme_code` 建有非唯一索引供查询。
- HighGo 元数据测试已扩展至 12 个实体，验证 guide 表列类型与软删除字段。

---

## 三、新增权限与角色分配

| permissionCode | 固定 ID 前缀 | 名称 |
|---|---|---|
| `guide:dept:read` | `00000005-…-001` | 部门映射查看 |
| `guide:dept:create` | `00000005-…-002` | 部门映射创建 |
| `guide:dept:update` | `00000005-…-003` | 部门映射编辑 |
| `guide:dept:delete` | `00000005-…-004` | 部门映射删除 |
| `guide:theme:read` | `00000005-…-005` | 主题映射查看 |
| `guide:theme:create` | `00000005-…-006` | 主题映射创建 |
| `guide:theme:update` | `00000005-…-007` | 主题映射编辑 |
| `guide:theme:delete` | `00000005-…-008` | 主题映射删除 |

**角色分配（保守策略）**：

| 角色 | 分配 |
|---|---|
| `SUPER_ADMIN` | 守卫层 bypass，无需种子关联 |
| `CONTENT_EDITOR` | 迁移 `SeedGuideRolePermissions` 自动授予全部 8 项 guide 权限（办事指南展示配置与内容维护职责相近） |
| `PUBLISH_REVIEWER` | **不**自动授予任何 guide 权限 |

权限迁移具备固定 ID 冲突保护、同 code 不同 ID 跳过、down 前 role-permission 引用检查。

---

## 四、API、DTO 与错误处理

### 部门映射

- `GET /api/admin/guide/depts` — 分页列表，`guide:dept:read`
- `POST /api/admin/guide/depts` — 创建，`guide:dept:create`
- `PUT /api/admin/guide/depts/:id` — 更新，`guide:dept:update`（DTO 不含 `deptCode`）
- `DELETE /api/admin/guide/depts/:id` — 逻辑删除，`guide:dept:delete`

### 主题映射

- `GET /api/admin/guide/themes` — 分页列表，`guide:theme:read`
- `POST /api/admin/guide/themes` — 创建，`guide:theme:create`
- `PUT /api/admin/guide/themes/:id` — 更新，`guide:theme:update`（DTO 不含 `themeCode`）
- `DELETE /api/admin/guide/themes/:id` — 逻辑删除，`guide:theme:delete`

**统一行为**：JWT + RBAC；`ValidationPipe` whitelist + forbidNonWhitelisted；统一 `{ code, message, data }` 响应；列表 `{ list, total, page, pageSize }`；返回 DTO 不暴露 `deletedAt`；`isVisible` 仅允许 0/1；非法 JSON / 未知字段 → 400；编码重复 → 409；未登录 → 401；无权限 → 403。不记录或返回共享平台凭据。

---

## 五、实际修改文件

### 新增

- `backend/src/database/entities/guide-dept-mapping.entity.ts`
- `backend/src/database/entities/guide-theme-mapping.entity.ts`
- `backend/src/database/migrations/1749895200000-CreateGuideMappingTables.ts`
- `backend/src/database/migrations/1749898800000-SeedGuidePermissions.ts`
- `backend/src/database/migrations/1749902400000-SeedGuideRolePermissions.ts`
- `backend/src/guide-config/`（module、dept/theme service、DTO、JSON 校验器）
- `backend/src/admin-api/controllers/guide-depts.controller.ts`
- `backend/src/admin-api/controllers/guide-themes.controller.ts`
- `backend/test/guide-config.spec.ts`
- `backend/test/guide-migration.spec.ts`
- `backend/test/seed-guide-permissions-migration.spec.ts`
- `backend/test/seed-guide-role-permissions-migration.spec.ts`

### 修改

- `backend/src/database/database-config.factory.ts` — 注册 2 实体 + 3 迁移
- `backend/src/admin-api/admin-api.module.ts` — 挂载 GuideConfigModule 与控制器
- `backend/test/highgo-metadata.spec.ts` — 12 实体 + guide 列类型断言
- `backend/test/database-config.spec.ts` — 12 实体 / 10 迁移
- `backend/test/content-migration-fresh-install.spec.ts` — 10 迁移 + guide 表
- `backend/test/helpers/project-schema-reset.ts` — drop 顺序含 guide 表
- `CLAUDE.md` — 开发状态

### 未修改

- `admin-web/**`、`kiosk-app/**`、`deploy/**`、端口、`backend/.env`、实际数据库

---

## 六、验证命令与结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run type-check` | ✅ 通过 |
| `cd backend && npm run build` | ✅ 通过 |
| `cd backend && npm test -- --runInBand` | ✅ 400 passed，35 skipped |
| `cd admin-web && npm run type-check` | ✅ 通过 |
| `cd admin-web && npm run build` | ✅ 通过 |
| `cd admin-web && npm test` | ✅ 129 passed |
| `cd kiosk-app && npm run build` | ✅ 通过 |
| `cd kiosk-app && npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ 通过 |
| `cd kiosk-app/tests && npm test` | ✅ 91 passed |

### 远程探测

| URL | 期望 | 实际 |
|---|---|---|
| `http://10.217.19.22:5183` | 200 | 200 |
| `http://10.217.19.22:5183/api/public/home/config` | 200 | 200 |
| `http://10.217.19.22:5184/login` | 200 | 200 |
| `http://10.217.19.22:3100/api/admin/auth/profile`（未登录） | 401 | 401 |

---

## 七、未完成事项与风险

| 项 | 说明 |
|---|---|
| `guide_item_config` | 留待 Step 10 后续阶段 |
| `guide_api_cache` | 随 ServiceGuideModule 真实对接实现 |
| 群众端 `/api/public/service-guide/*` | 本阶段未改动 PublicApiModule |
| 管理端办事指南配置页面 | 未改 admin-web |
| 编码唯一性 | 应用层保证；软删除后允许同编码重建；若需禁止重建需另行约定 |
| 生产迁移 | 本交付仅编写迁移与测试，**未**连接或执行实际数据库迁移 |

---

## 八、环境声明

- **是否连接或修改实际数据库**：否（未连接 oms_db、mydb 或任何生产/开发库）
- **是否修改前端、部署和端口**：否
