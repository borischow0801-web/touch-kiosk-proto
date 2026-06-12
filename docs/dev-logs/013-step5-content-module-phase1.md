# 013 · Step 5 ContentModule 第一阶段 — 内容数据基础与管理端核心能力

**交付日期**：2026-06-12  
**基于**：012-step4-migration-safety-closure.md 完成后  
**状态**：✅ 完成

---

## 一、集成测试安全收尾

修复 `backend/test/mysql-integration.spec.ts`：

| 要求 | 实现 |
|---|---|
| 关闭 SQL logging | `buildIntegrationDataSourceOptions()` 强制 `logging: false` |
| `NODE_ENV=production` 拒绝运行 | `assertMysqlIntegrationEnvironment()` 抛错 |
| `DB_DIALECT` 非 mysql 拒绝运行 | 同上 |
| 输出不含密码/哈希/Token/连接串 | 关闭 logging；测试不打印凭据 |
| 显式启用、失败即失败 | `RUN_MYSQL_INTEGRATION=true` + `describe.skip` 默认跳过 |

---

## 二、修改文件清单

### 数据库

| 文件 | 说明 |
|---|---|
| `backend/src/database/entities/content-category.entity.ts` | 新建 |
| `backend/src/database/entities/content-item.entity.ts` | 新建 |
| `backend/src/database/entities/content-version.entity.ts` | 新建（仅追加，无 deleted_at） |
| `backend/src/database/entities/content-relation.entity.ts` | 新建 |
| `backend/src/database/migrations/1749859200000-CreateContentTables.ts` | 新建 DDL |
| `backend/src/database/migrations/1749862800000-SeedContentPermissions.ts` | 新建 11 条 content 权限 |
| `backend/src/database/database-config.factory.ts` | 注册 4 实体 + 2 迁移 |

### ContentModule

| 文件 | 说明 |
|---|---|
| `backend/src/content/content.module.ts` | 模块注册 |
| `backend/src/content/constants/content-types.ts` | 9 类内容类型白名单 |
| `backend/src/content/constants/relation-types.ts` | 关联类型白名单 |
| `backend/src/content/categories.service.ts` | 分类 CRUD + 删除冲突 |
| `backend/src/content/items.service.ts` | 内容 CRUD + 版本追加 |
| `backend/src/content/relations.service.ts` | 关联查询与替换 |
| `backend/src/content/dto/*.ts` | 8 个请求 DTO |

### Admin API

| 文件 | 说明 |
|---|---|
| `backend/src/admin-api/controllers/content-categories.controller.ts` | 分类接口 |
| `backend/src/admin-api/controllers/content-items.controller.ts` | 内容/版本/关联接口 |
| `backend/src/admin-api/admin-api.module.ts` | 注册 ContentModule |

### 测试

| 文件 | 说明 |
|---|---|
| `backend/test/content.spec.ts` | 30 项单元 + HTTP 测试 |
| `backend/test/content-migration.spec.ts` | 迁移静态扫描 |
| `backend/test/mysql-integration.spec.ts` | 安全收尾修复 |
| `backend/test/database-config.spec.ts` | 9 实体 / 4 迁移断言 |

---

## 三、管理端接口

| 方法 | 路径 | 权限码 |
|---|---|---|
| GET | `/api/admin/content/categories` | `content:category:read` |
| POST | `/api/admin/content/categories` | `content:category:create` |
| PUT | `/api/admin/content/categories/:id` | `content:category:update` |
| DELETE | `/api/admin/content/categories/:id` | `content:category:delete` |
| GET | `/api/admin/content/items` | `content:item:read` |
| POST | `/api/admin/content/items` | `content:item:create` |
| GET | `/api/admin/content/items/:id` | `content:item:read` |
| PUT | `/api/admin/content/items/:id` | `content:item:update` |
| DELETE | `/api/admin/content/items/:id` | `content:item:delete` |
| GET | `/api/admin/content/items/:id/versions` | `content:version:read` |
| GET | `/api/admin/content/versions/:versionId` | `content:version:read` |
| GET | `/api/admin/content/items/:id/relations` | `content:relation:read` |
| PUT | `/api/admin/content/items/:id/relations` | `content:relation:update` |

---

## 四、业务规则实现

1. 所有接口经全局 `JwtAuthGuard` + `PermissionsGuard` 保护
2. 创建内容 `status` 固定为 `draft`，同事务创建 `version_no=1` 首版本
3. 编辑 `title/summary/body/extraJson` 追加新版本，`content_version` 只增不改
4. DTO 不含 `status`/`currentVersionId`/`publishAt`；`forbidNonWhitelisted` 拦截直接发布
5. `content_type` 限制为 database.md 基线 9 类（见 `content-types.ts`）
6. 分类/内容删除为逻辑删除
7. 分类有子分类或内容时删除返回 409
8. 关联禁止自关联、验证目标存在、三元组唯一
9. 列表接口返回 `{ list, total, page, pageSize }`
10. 错误经 `HttpExceptionFilter` 统一包装

---

## 五、新增 RBAC 权限（SeedContentPermissions 迁移）

| permissionCode | 名称 |
|---|---|
| `content:category:read` | 分类查看 |
| `content:category:create` | 分类创建 |
| `content:category:update` | 分类编辑 |
| `content:category:delete` | 分类删除 |
| `content:item:read` | 内容查看 |
| `content:item:create` | 内容创建 |
| `content:item:update` | 内容编辑 |
| `content:item:delete` | 内容删除 |
| `content:version:read` | 版本查看 |
| `content:relation:read` | 关联查看 |
| `content:relation:update` | 关联编辑 |

固定 ID 前缀 `00000003`，所有权规则与 SeedRbacData 一致。

---

## 六、迁移结果

```
npm run migration:show

[X] CreateRbacTables1749686400000
[X] SeedRbacData1749772800000
[X] CreateContentTables1749859200000
[X] SeedContentPermissions1749862800000
```

`CreateContentTables`：4 张表，TypeORM Table API，无自增/enum/JSON 列/MySQL 专属 SQL。

---

## 七、测试结果

```
npm run type-check     →  ✅ 0 errors
npm run build          →  ✅
npm test -- --runInBand →  ✅ 254 passed, 1 skipped（MySQL 集成默认跳过）
npm run test:integration:mysql →  ✅ 1 passed（并发 SA 保护，无 SQL 日志泄露）
```

| 套件 | 通过 | 跳过 |
|---|---|---|
| 默认 `npm test` | 254 | 1 |
| `test:integration:mysql` | 1 | 0 |

**content.spec.ts 覆盖**：分类 CRUD/删除冲突、首版本创建、版本追加、非法类型、禁止直接发布、关联校验、401/403、分页结构。

**content-migration.spec.ts**：迁移 DDL 兼容性静态扫描。

---

## 八、三端构建

```
kiosk-app build   →  ✅（无变更，/api/public/* 仍可匿名访问）
admin-web build   →  ✅
```

群众端未新增输入框；未实现群众端内容页面、PublishModule、admin-web 页面。

---

## 九、HighGo 未实连说明

- DDL 与种子权限迁移使用 TypeORM Manager/Table API，无 MySQL 专属 SQL
- `database-config.spec.ts` 验证 MySQL/HighGo 共享相同 4 迁移
- HighGo 实连迁移冒烟待生产库就绪后执行

---

## 十、剩余风险与未完成项

| 项 | 说明 |
|---|---|
| PublishModule 未实现 | 状态流转、发布、撤回、回滚属 Step 6 |
| 群众端 `/api/public/content/*` | 本阶段未实现 |
| admin-web 内容管理页面 | 未实现 |
| 文件上传 `cover_file_id` | 字段预留，FileModule 未实现 |
| CONTENT_EDITOR 默认无 content 权限 | 需管理员为角色分配新权限后方可操作 |
| 内容类型为 9 类 | 与 database.md / architecture.md 一致；CLAUDE.md「10 种」为概数表述 |

---

## 十一、进入 Step 6 PublishModule 的条件评估

| 检查项 | 状态 |
|---|---|
| content 四表迁移执行 | ✅ |
| 管理端 CRUD + 版本追加 | ✅ |
| 内容关联管理 | ✅ |
| RBAC 权限种子 | ✅ |
| 254+ 测试通过 | ✅ |
| 三端构建全绿 | ✅ |
| 未越界实现 PublishModule | ✅ |

**结论：ContentModule 第一阶段完成，具备进入 Step 6 PublishModule（审核发布流程）的条件。**
