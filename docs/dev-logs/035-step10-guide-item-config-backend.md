# 035 · Step 10 GuideConfigModule Phase 2：guide_item_config 管理端后端

**交付日期**：2026-06-12  
**基于**：034-step10-guide-config-final-closure.md  
**状态**：✅ 完成（未进入群众端接口、ServiceGuideModule 真实调用、管理端页面）

---

## 一、修改文件

### 新增

| 路径 | 说明 |
|---|---|
| `backend/src/database/entities/guide-item-config.entity.ts` | guide_item_config 实体 |
| `backend/src/database/migrations/1749910800000-CreateGuideItemConfigTable.ts` | 建表迁移 |
| `backend/src/database/migrations/1749914400000-SeedGuideItemPermissions.ts` | 4 条事项配置权限 |
| `backend/src/database/migrations/1749918000000-SeedGuideItemRolePermissions.ts` | CONTENT_EDITOR 角色授权 |
| `backend/src/guide-config/item-config.service.ts` | 事项展示配置业务逻辑 |
| `backend/src/guide-config/dto/create-item-config.dto.ts` | 创建 DTO |
| `backend/src/guide-config/dto/update-item-config.dto.ts` | 更新 DTO（不可改 platformItemId） |
| `backend/src/guide-config/dto/item-config-list-query.dto.ts` | 列表筛选 DTO |
| `backend/src/guide-config/dto/normalize-platform-item-id.transform.ts` | platformItemId trim 转换 |
| `backend/src/guide-config/utils/normalize-platform-item-id.util.ts` | platformItemId 规范化 |
| `backend/src/guide-config/utils/related-ids.util.ts` | 关联 ID 序列化/反序列化 |
| `backend/src/admin-api/controllers/guide-item-configs.controller.ts` | 管理端 CRUD 控制器 |
| `backend/test/guide-item-config.spec.ts` | 服务单元 + HTTP 集成测试 |
| `backend/test/guide-item-config-migration.spec.ts` | 建表迁移静态扫描 |
| `backend/test/seed-guide-item-permissions-migration.spec.ts` | 权限迁移幂等/冲突 |
| `backend/test/seed-guide-item-role-permissions-migration.spec.ts` | 角色授权迁移安全 |
| `backend/test/related-ids.util.spec.ts` | 关联 ID 工具测试 |

### 修改

| 路径 | 说明 |
|---|---|
| `backend/src/guide-config/guide-config.module.ts` | 注册 ItemConfigService、GuideItemConfig 实体 |
| `backend/src/guide-config/utils/unique-code.util.ts` | 扩展 `isGuideUniqueViolation` 支持 platformItem |
| `backend/src/admin-api/admin-api.module.ts` | 注册 GuideItemConfigsController |
| `backend/src/database/database-config.factory.ts` | 13 实体、13 迁移 |
| `backend/test/helpers/project-schema-reset.ts` | drop 顺序含 guide_item_config |
| `backend/test/database-config.spec.ts` | 实体/迁移计数 13 |
| `backend/test/highgo-metadata.spec.ts` | guide_item_config HighGo 元数据断言 |
| `backend/test/content-migration-fresh-install.spec.ts` | 全量迁移计数 13 |
| `CLAUDE.md` | 开发状态更新 |

### 未修改

- `admin-web/**`、`kiosk-app/**`（除验证命令外无功能改动）
- `ServiceGuideModule`、guide_api_cache、`/api/public/service-guide/*`
- `backend/.env`、实际数据库连接与迁移执行

---

## 二、数据表及字段设计

表名：`guide_item_config`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | varchar(36) | 主键，后端 UUID v4 |
| `platform_item_id` | varchar(100) | 共享平台事项 ID，**全局唯一**（含软删行） |
| `item_name` | varchar(255) | 平台事项名称 |
| `display_name` | varchar(255) | 展示名称 |
| `dept_code` | varchar(50) nullable | 部门编码，复用 normalizeGuideCode |
| `theme_code` | varchar(50) nullable | 主题编码，复用 normalizeGuideCode |
| `is_hot` | smallint | 0/1，是否热门 |
| `is_recommend` | smallint | 0/1，是否推荐 |
| `is_visible` | smallint | 0/1，是否可见，默认 1 |
| `sort_order` | int | 排序，非负整数 |
| `related_policy_ids` | text nullable | 关联政策 ID 列表（序列化） |
| `related_faq_ids` | text nullable | 关联 FAQ ID 列表（序列化） |
| `created_at` | timestamp | 创建时间 |
| `updated_at` | timestamp | 更新时间 |
| `deleted_at` | timestamp nullable | 逻辑删除 |

### 索引

| 名称 | 类型 | 列 |
|---|---|---|
| `uk_guide_item_config_platform_item_id` | UNIQUE | platform_item_id |
| `idx_guide_item_config_dept_code` | INDEX | dept_code |
| `idx_guide_item_config_theme_code` | INDEX | theme_code |
| `idx_guide_item_config_sort_order` | INDEX | sort_order |

实体 `@Index` 名称与迁移 `TableIndex.name` 完全一致。

---

## 三、text 字段序列化格式

`related_policy_ids`、`related_faq_ids` 使用 **JSON 数组字符串**（非数据库 JSON 类型）：

```
输入 API: string[]（元素须为合法 varchar(36) UUID）
处理: 去重 → 字典序排序 → JSON.stringify
存储: text 列，空数组存 null
输出 API: 反序列化为 string[]，解析失败返回 []
```

示例：`["2222...","1111..."]` → 存储 `["1111...","2222..."]`

不使用逗号拼接等歧义格式。

---

## 四、唯一性与逻辑删除规则

- `platform_item_id` 建立数据库级唯一索引 `uk_guide_item_config_platform_item_id`
- 唯一约束**包含逻辑删除行**（索引不区分 deleted_at）
- 软删除后相同 platformItemId **不得**再次创建（应用层 `withDeleted: true` 查重 + DB 唯一索引双保险）
- 创建后 **platformItemId 不可更新**（Update DTO 禁止该字段）
- 并发冲突：捕获 MySQL 1062 / PostgreSQL 23505，统一返回 409，不泄漏数据库异常详情

---

## 五、管理端接口清单

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/guide/item-configs` | `guide:item:read` | 分页列表，筛选 deptCode/themeCode/isHot/isRecommend/isVisible |
| POST | `/api/admin/guide/item-configs` | `guide:item:create` | 创建配置 |
| PUT | `/api/admin/guide/item-configs/:id` | `guide:item:update` | 更新配置 |
| DELETE | `/api/admin/guide/item-configs/:id` | `guide:item:delete` | 逻辑删除 |

### 响应字段（列表/详情）

暴露：`id`、`platformItemId`、`itemName`、`displayName`、`deptCode`、`themeCode`、`isHot`、`isRecommend`、`isVisible`、`sortOrder`、`relatedPolicyIds[]`、`relatedFaqIds[]`、`createdAt`

**不暴露**：`deletedAt`、`updatedAt`、内部 text 序列化原文

### 校验规则摘要

| 规则 | 行为 |
|---|---|
| platformItemId | trim，禁止空字符串；创建时唯一 |
| deptCode / themeCode | normalizeGuideCode（trim + uppercase）；更新允许 null 清空 |
| itemName / displayName | 禁止空白字符串 |
| isHot / isRecommend / isVisible | 仅 0 或 1 |
| sortOrder | 非负整数 |
| relatedPolicyIds / relatedFaqIds | UUID 数组，去重排序 |
| 未知字段 | 400（ValidationPipe whitelist） |
| 必填字段 null | 400（ValidateIf 区分 undefined/null） |

---

## 六、权限清单

| ID 前缀 | permissionCode | 授予角色 |
|---|---|---|
| `00000007-...-001` | `guide:item:read` | CONTENT_EDITOR |
| `00000007-...-002` | `guide:item:create` | CONTENT_EDITOR |
| `00000007-...-003` | `guide:item:update` | CONTENT_EDITOR |
| `00000007-...-004` | `guide:item:delete` | CONTENT_EDITOR |

角色关联 ID 前缀：`00000008-...`

SUPER_ADMIN 守卫 bypass，无需显式授权。

---

## 七、迁移安全策略

### CreateGuideItemConfigTable1749910800000

- TypeORM Table API，无 raw SQL、无 MySQL 专属 DDL
- down 仅 `dropTable('guide_item_config')`

### SeedGuideItemPermissions1749914400000

- 固定 UUID（前缀 00000007），permissionCode 冲突时校验全字段归属
- 归属不匹配 → 明确拒绝
- 已存在且匹配 → 跳过（幂等）
- down 仅删除本迁移插入的 4 条权限及其角色关联

### SeedGuideItemRolePermissions1749918000000

- 固定 UUID（前缀 00000008）
- up 前校验 CONTENT_EDITOR：存在、active、未软删、roleCode 匹配
- 校验 4 条权限均已存在且字段匹配
- 角色关联冲突时校验 roleId + permissionId 归属
- 存在非本迁移关联 → down 拒绝误删
- down 仅删除本迁移拥有的 4 条 sys_role_permission

---

## 八、测试覆盖与结果

### 本阶段新增测试（46 项）

| 文件 | 数量 | 覆盖点 |
|---|---|---|
| `guide-item-config.spec.ts` | 23 | CRUD、409/404/401/403、编码、null、筛选、响应脱敏 |
| `guide-item-config-migration.spec.ts` | 8 | 字段类型、唯一索引、逻辑删除列、方言中立 DDL |
| `seed-guide-item-permissions-migration.spec.ts` | 6 | 权限幂等、归属冲突、安全 down |
| `seed-guide-item-role-permissions-migration.spec.ts` | 5 | 角色校验、关联幂等、安全 down |
| `related-ids.util.spec.ts` | 4 | 序列化、去重、反序列化、空值 |

### 更新测试

- `database-config.spec.ts`：13 实体 / 13 迁移
- `highgo-metadata.spec.ts`：guide_item_config smallint/text/唯一索引
- `content-migration-fresh-install.spec.ts`：全量迁移 13 条（需 `RUN_MYSQL_MIGRATION_FRESH_INSTALL=true`）

### 验证命令结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run type-check` | ✅ 通过 |
| `cd backend && npm run build` | ✅ 通过 |
| `cd backend && npm test -- --runInBand` | ✅ **478 passed**, 35 skipped（30 套件中 24 通过） |
| `cd admin-web && npm run type-check && npm run build && npm test -- --run` | ✅ 129 passed |
| `cd kiosk-app && npm run build && npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ 通过 |
| `cd kiosk-app/tests && npm test -- --run` | ✅ 91 passed |

相较 Phase 1 收尾（431 passed），本阶段净增 **47** 项后端测试，原有 GuideConfig、Content、Publish、Auth 等套件无回归。

---

## 九、数据库连接说明

**未连接或修改实际数据库。** 所有迁移仅作为代码与静态扫描/单元测试验证；MySQL 全量 fresh-install 测试仍为 opt-in（`RUN_MYSQL_MIGRATION_FRESH_INSTALL=true`）。

---

## 十、未完成事项与风险

| 项 | 说明 |
|---|---|
| 管理端页面 | admin-web 事项配置 UI 未实现 |
| 群众端接口 | `/api/public/service-guide/*` 未实现 |
| 共享平台对接 | ServiceGuideModule 仍为 mock，无真实同步 |
| 关联内容校验 | relatedPolicyIds/relatedFaqIds 未跨模块校验内容是否存在 |
| dept/theme 外键 | deptCode/themeCode 未与 guide_dept_mapping/guide_theme_mapping 建立 FK |
| 实际迁移执行 | 需在部署环境手动 `npm run migration:run` |
| guide_api_cache | 未实现 |

### 风险

- 生产首次执行迁移前须确认 `00000007`/`00000008` 前缀 UUID 未被占用
- platform_item_id 全局唯一含软删：恢复已删记录需运维介入（本阶段未提供恢复接口）

---

## 十一、停止边界

本阶段按要求在 **guide_item_config 管理端后端** 交付后停止，未进入 ServiceGuideModule、群众端接口或管理端页面开发。
