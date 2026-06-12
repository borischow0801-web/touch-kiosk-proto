# 011 · Step 4 SystemModule 安全闭环

**交付日期**：2026-06-12  
**基于**：010-step4-system-module-phase1.md + recovery_report.md 中断恢复  
**状态**：✅ 完成

---

## 一、接手时的半成品状态

Claude Code 在 Step 4 安全闭环中途中断。接手时：

| 项 | 状态 |
|---|---|
| `UsersService` 事务 + 悲观锁 + `guardLastSuperAdminInTx` | ✅ 已实现 |
| `PUT /api/admin/system/users/:id/roles` 控制器 | ✅ 已实现 |
| `PermissionsController` + 模块注册 | ✅ 已实现 |
| `AssignRolesDto` / `AssignPermissionsDto` 校验增强 | ✅ 已实现 |
| `SeedRbacData1749772800000` 迁移文件 | ⚠️ 存在但 up/down 不安全 |
| `RolesService.listPermissions()` 公开 DTO | ❌ 直接返回实体 |
| `UsersService` 单元测试 DataSource mock | ❌ 缺失，15 项测试失败 |
| `database-config.spec.ts` 迁移数量断言 | ❌ 仍为 1 个 |
| 安全闭环测试覆盖 | ❌ 不完整 |
| `011` 交付报告 | ❌ 未生成 |

---

## 二、中断前已存在的代码（未回滚）

```
backend/src/system/
├── constants/role-codes.ts          共享 SUPER_ADMIN / ALLOWED_ROLE_CODES
├── dto/assign-roles.dto.ts          新建
├── dto/assign-permissions.dto.ts    @ArrayUnique + @MaxLength 补齐
└── users.service.ts                 事务 + 悲观锁 + assignRoles + guardLastSuperAdminInTx

backend/src/admin-api/controllers/
├── users.controller.ts              update 传 currentUserId + PUT :id/roles
└── permissions.controller.ts        GET /api/admin/system/permissions

backend/src/database/migrations/
└── 1749772800000-SeedRbacData.ts    初版种子迁移

docs/api-spec.md                     补充 roles / permissions 端点
```

---

## 三、Cursor 实际补完内容

| # | 文件 | 变更 |
|---|---|---|
| 1 | `1749772800000-SeedRbacData.ts` | 重写 up/down：双键检查（固定 ID + 业务 code）、冲突显式失败、回滚前拒绝破坏业务关联 |
| 2 | `users.service.ts` | `assignRoles()` 角色校验与写入全部移入事务内，事务内 `pessimistic_write` 重查角色 |
| 3 | `roles.service.ts` | 新增 `PermissionListItem` DTO，`listPermissions()` 显式字段映射 |
| 4 | `test/system.spec.ts` | 补全 DataSource/EntityManager mock；新增 35+ 安全/权限/并发测试 |
| 5 | `test/database-config.spec.ts` | 迁移数量改为 2，验证顺序 |
| 6 | `docs/progress/recovery_report.md` | 标记为中断快照，更新真实状态 |
| 7 | `CLAUDE.md` | Step 4 标记为安全闭环完成 |

---

## 四、API 基线变更

| 方法 | 路径 | 权限码 | 说明 |
|---|---|---|---|
| PUT | `/api/admin/system/users/:id/roles` | `system:user:assign-roles` | 替换用户角色，禁止自改、保护最后 SA |
| GET | `/api/admin/system/permissions` | `system:permission:read` | 权限列表，仅返回公开 DTO 字段 |

种子迁移新增权限码：`system:user:assign-roles`、`system:permission:read`（共 12 条 System 权限）。

---

## 五、自我禁用/自删修复

| 操作 | 保护点 | 错误 |
|---|---|---|
| `PUT :id` + `status=disabled` | `update()` 入口 | 403 不允许禁用自己的账号 |
| `POST :id/disable` | `disable()` 入口 | 403 不允许禁用自己的账号 |
| `DELETE :id` | `remove()` 入口 | 403 不允许删除自己的账号 |
| `PUT :id/roles` | `assignRoles()` 入口 | 403 不允许修改自己的角色 |

自保护优先于事务，不进入 `dataSource.transaction`。

---

## 六、用户角色分配

- DTO：`roleIds` 数组，`@ArrayUnique` + `@MaxLength(36, {each:true})`
- 事务内：锁定目标用户行 → 锁定并验证角色 → SA 撤除保护 → 先删后插 `sys_user_role`
- 允许空数组清除角色
- 不存在/禁用/未规划角色：404 或 403
- 移除最后一个有效 SUPER_ADMIN：403

---

## 七、权限列表公开 DTO

`listPermissions()` 返回 `PermissionListItem[]`，仅含：

- `id`、`permissionCode`、`permissionName`、`moduleCode`、`permissionType`、`sortOrder`

不含 `createdAt`、`updatedAt` 等内部字段。

---

## 八、最后一个 SUPER_ADMIN 事务和锁策略

```
guardLastSuperAdminInTx(targetUserId, manager):
  1. manager.findOne(SysRole, { roleCode: SUPER_ADMIN, status: active, lock: pessimistic_write })
     → 序列化点，所有 SA 相关操作串行
  2. manager.find(SysUserRole, { roleId: saRole.id })
  3. 过滤掉 targetUserId，若无其他 SA 用户 → 403
  4. manager.findOne(SysUser, { id: In(otherIds), status: active })
     → 无其他 active SA → 403
```

**统一入口**（均经 `dataSource.transaction`）：

- `update()` 当 `status → disabled`
- `remove()`
- `disable()`
- `assignRoles()` 当撤除 SA 角色

---

## 九、种子迁移冲突及安全回滚策略

> **勘误（2026-06-12）**：本节初版对所有权规则的描述不准确——曾允许“固定 ID + 相同 code 已存在时 up() 跳过”，会导致 down() 可能删除非本迁移创建的数据。  
> 正确规则见 `012-step4-migration-safety-closure.md`。摘要如下：

### up()（012 修正后）

1. 固定 ID 已存在（无论 code 是否相同）→ **拒绝迁移**
2. 固定 ID 不存在、同 code 不同 ID 已存在 → **跳过插入**（非破坏性）
3. 均不存在 → 插入种子行
4. **不创建默认管理员，不写入默认密码**

### down()（012 修正后）

1. 有 `sys_user_role` / `sys_role_permission` 引用 → **拒绝回滚**
2. 固定 ID 存在但 code 不匹配 → **拒绝回滚**（不得静默跳过或删除）
3. 固定 ID + 预期 code 均匹配 → 删除该种子行
4. **不删除**同 code 不同 ID 的既有记录、不删除关联表记录

---

## 十、密码安全验证

| 场景 | 验证方式 |
|---|---|
| 创建用户 | `passwordHash !== 明文`；`bcrypt.compare` 通过 |
| 重置密码 | `update` 参数中 hash 不等于明文；`bcrypt.compare` 通过 |
| HTTP 响应 | `JSON.stringify(body)` 不含 `passwordHash` 和明文密码 |

---

## 十一、401/403 验证

| 端点 | 无 Token | 无权限（CONTENT_EDITOR 无对应 perm） | SUPER_ADMIN |
|---|---|---|---|
| `PUT users/:id/roles` | 401 | 403 | 200 |
| `GET permissions` | 401 | 403 | 200 |

---

## 十二、事务失败回滚验证

| 操作 | 模拟方式 | 断言 |
|---|---|---|
| `assignRoles` | transaction 内 `save` 抛错 | 抛出 `tx fail`，`transaction` 被调用 |
| `assignPermissions` | transaction 内 `save` 抛错 | 抛出 `tx fail`，`transaction` 被调用 |

Mock 环境下验证事务入口与失败路径；真实 DB 回滚由 TypeORM `transaction()` 保证。

---

## 十三、migration run/revert/run 真实输出摘要

```
# 首次 migration:show
[X] CreateRbacTables1749686400000
[ ] SeedRbacData1749772800000

# migration:run
Migration SeedRbacData1749772800000 has been executed successfully.
→ 插入 3 角色 + 12 权限，无默认管理员

# migration:show（run 后）
[X] CreateRbacTables1749686400000
[X] SeedRbacData1749772800000

# migration:revert
检查 user_role / role_permission 引用计数 = 0
删除 12 权限 + 3 角色（仅匹配种子 ID+code）
Migration SeedRbacData1749772800000 has been reverted successfully.

# migration:show（revert 后）
[X] CreateRbacTables1749686400000
[ ] SeedRbacData1749772800000

# migration:run（再次）
Migration SeedRbacData1749772800000 has been executed successfully.

# 最终 migration:show
[X] CreateRbacTables1749686400000
[X] SeedRbacData1749772800000
```

---

## 十四、后端测试总数和结果

```
npm test -- --runInBand
Test Suites: 4 passed, 4 total
Tests:       192 passed, 192 total
```

新增测试覆盖（相比 010 的 157 项）：

| 分类 | 新增约 |
|---|---|
| UsersService 事务 mock + 安全 | 18 |
| assignRoles 单元 + HTTP | 12 |
| 权限列表 DTO + HTTP 401/403 | 5 |
| 权限分配 DTO 校验 + 事务失败 | 4 |
| 并发保护（mock 入口 + MySQL 集成） | 2 |
| database-config 双迁移 | 1 |

---

## 十五、三端构建结果

```
# backend
npm run type-check  →  ✅ 0 errors
npm run build       →  ✅ nest build 成功
npm test            →  ✅ 192/192

# kiosk-app
npm run build       →  ✅ 53 modules, built in 2.67s

# admin-web
npm run type-check  →  ✅ 0 errors
npm run build       →  ✅ 25 modules, built in 969ms
```

`/api/public/*` 未改动，群众端仍匿名访问；kiosk-app 无输入框引入。

---

## 十六、并发保护验证方式与限制

| 层级 | 方式 | 结论 |
|---|---|---|
| 单元测试 | 验证 `update/disable/remove/assignRoles` 四次均调用 `dataSource.transaction`；`findOne`/`find` 使用 `pessimistic_write` | ✅ |
| Mock 集成 | HTTP 层自禁/自删/403 路径 | ✅ |
| MySQL 集成 | 见 012：独立 `test/mysql-integration.spec.ts`，需 `RUN_MYSQL_INTEGRATION=true` | ✅（012 修正静默通过问题后） |

**限制**：默认 `npm test` 跳过 MySQL 集成（1 skipped）；需 `npm run test:integration:mysql` 显式启用。HighGo 未实连。

---

## 十七、HighGo 未实连说明

- 种子迁移使用 TypeORM Manager API，无 MySQL 专属 SQL
- `database-config.spec.ts` 验证 MySQL/HighGo 共享相同 2 个迁移及顺序
- HighGo 实连迁移与并发锁行为待生产库就绪后验证（延续 007/009 说明）

---

## 十八、剩余风险

| 风险 | 等级 | 说明 |
|---|---|---|
| 种子 down 在已有用户角色关联时拒绝回滚 | 信息 | 设计行为，需先清理业务关联 |
| 同 code 不同 ID 时种子 up 跳过 | 低 | 需人工对齐 ID 或沿用已有记录 |
| MySQL 集成测试环境依赖 | 低 | 无 DB 时 describe 自动跳过 |
| `sys_operation_log` / `sys_login_log` | 低 | 仍待后续步骤 |
| Token 无黑名单 | 低 | 一期已知限制 |

---

## 十九、是否具备进入 Step 5 ContentModule 的条件

| 检查项 | 状态 |
|---|---|
| 用户 CRUD + 角色分配安全闭环 | ✅ |
| 角色权限分配事务 | ✅ |
| 权限列表 API | ✅ |
| 最后一个 SA 保护（事务 + 锁） | ✅ |
| 种子迁移 run/revert/run | ✅ |
| 192/192 测试通过 | ✅ |
| 三端构建全绿 | ✅ |
| 无 ContentModule / PublishModule 越界实现 | ✅ |

**结论：SystemModule 安全闭环已完成，具备进入 Step 5 ContentModule 的条件。**
