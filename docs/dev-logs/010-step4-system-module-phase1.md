# 010 · Step 4 SystemModule 第一阶段 — 用户管理与角色权限管理

**交付日期**：2026-06-12  
**基于**：Step 3（AuthModule 安全闭环）完成后  
**状态**：✅ 完成

---

## 一、本次范围

### Step 3 最终一致性修复（随本次一并交付）

| # | 问题 | 状态 |
|---|---|---|
| 1 | `getUserPermissions(userId, roles)` 信任调用方 roles 参数导致 SUPER_ADMIN 可被伪造 | ✅ 修复：移除 `roles` 参数，内部始终通过 `getActiveRoles()` 重新验证 |
| 2 | 开发环境弱密钥行为不一致（弱密钥仍被使用而非统一替换） | ✅ 修复：`isWeakJwtSecret(s) ? DEV_FALLBACK : s!` 统一使用固定开发默认值 |
| 3 | `docs/dev-logs/009` 描述与代码不符 | ✅ 已修订 |

### Step 4 第一阶段新增功能

| 模块 | 接口 | 实现状态 |
|---|---|---|
| 用户管理 | GET /api/admin/system/users | ✅ |
| 用户管理 | POST /api/admin/system/users | ✅ |
| 用户管理 | GET /api/admin/system/users/:id | ✅ |
| 用户管理 | PUT /api/admin/system/users/:id | ✅ |
| 用户管理 | DELETE /api/admin/system/users/:id | ✅ |
| 用户管理 | POST /api/admin/system/users/:id/reset-password | ✅ |
| 用户管理 | POST /api/admin/system/users/:id/disable | ✅ |
| 用户管理 | POST /api/admin/system/users/:id/enable | ✅ |
| 角色管理 | GET /api/admin/system/roles | ✅ |
| 角色管理 | POST /api/admin/system/roles | ✅ |
| 角色管理 | PUT /api/admin/system/roles/:id | ✅ |
| 角色管理 | DELETE /api/admin/system/roles/:id | ✅ |
| 角色管理 | PUT /api/admin/system/roles/:id/permissions | ✅ |

---

## 二、新增文件清单

```
backend/src/system/
├── dto/
│   ├── user-list-query.dto.ts      新建（GET 列表查询参数）
│   ├── create-user.dto.ts          新建（创建用户请求体）
│   ├── update-user.dto.ts          新建（更新用户请求体）
│   ├── reset-password.dto.ts       新建（重置密码请求体）
│   ├── create-role.dto.ts          新建（创建角色请求体，含 @IsIn 校验）
│   ├── update-role.dto.ts          新建（更新角色请求体）
│   └── assign-permissions.dto.ts   新建（分配权限请求体）
├── users.service.ts                新建（用户 CRUD + 业务约束）
├── roles.service.ts                新建（角色 CRUD + 权限事务分配）
└── system.module.ts                新建（SystemModule）

backend/src/admin-api/controllers/
├── users.controller.ts             新建（/api/admin/system/users/*）
└── roles.controller.ts             新建（/api/admin/system/roles/*）

backend/src/admin-api/
└── admin-api.module.ts             修改（导入 SystemModule，注册新 Controller）

backend/test/
└── system.spec.ts                  新建（157 项测试，含单元+HTTP集成）

docs/dev-logs/
├── 009-step3-auth-security-closure.md   修改（修正两处描述与代码不符）
└── 010-step4-system-module-phase1.md    新建（本文件）
```

---

## 三、业务约束实现

### 3.1 最后一个有效 SUPER_ADMIN 保护

任何触发"禁用"或"删除"操作时均调用 `guardLastSuperAdmin(targetUserId)`：

```
guardLastSuperAdmin(targetUserId):
  1. 查找 status=active AND deleted_at IS NULL 的 SUPER_ADMIN 角色
     → 若不存在（角色本身已失效），直接跳过保护
  2. 查找所有持有该角色的 user_role 关联
     → 过滤掉 targetUserId 本身
  3. 若过滤后没有其他用户 ID → 抛出 ForbiddenException
  4. 查询这些其他用户是否至少一个 status=active
     → 若无 → 抛出 ForbiddenException（其他 SA 均已禁用）
```

**覆盖场景**：删除/禁用操作、PUT 更新状态为 disabled。

### 3.2 不允许操作自己

`remove()` 和 `disable()` 入口处对比 `id === currentUserId`，直接抛出 `ForbiddenException`，优先于所有其他检查。

### 3.3 固定角色代码白名单

`CreateRoleDto` 中 `@IsIn(['SUPER_ADMIN', 'CONTENT_EDITOR', 'PUBLISH_REVIEWER'])` 在 DTO 层拦截（ValidationPipe 返回 400）。`RolesService.create()` 中有第二层 `ALLOWED_ROLE_CODES.has()` 检查作为纵深防御（返回 403）。

### 3.4 角色权限分配事务

```typescript
await this.dataSource.transaction(async (manager) => {
  await manager.delete(SysRolePermission, { roleId: id });
  if (permissionIds.length > 0) {
    await manager.save(SysRolePermission, newLinks);
  }
});
```

- 先删除旧关联，再批量插入新关联
- 整体原子操作，中途失败自动回滚
- 事务前验证所有 `permissionId` 存在于 `sys_permission`，防止孤立 FK
- 允许传入空数组（清除所有权限）

### 3.5 密码安全

- 创建用户、重置密码：`bcryptjs.hash(password, 10)`（salt rounds = 10）
- 所有响应对象均不包含 `passwordHash` 字段（`UserListItem` 接口不定义此字段）

---

## 四、数据库兼容性

| 规则 | 遵守情况 |
|---|---|
| 主键 varchar(36) UUID | ✅ 复用 BaseBusinessEntity.@BeforeInsert generateId() |
| 禁止自增主键 | ✅ |
| varchar 状态字段 | ✅ status: 'active' \| 'disabled' |
| tinyint/varchar 布尔/枚举 | ✅（无 ENUM 类型） |
| deleted_at 软删除 | ✅ 用户/角色均用 softDelete() |
| 关联表物理删除 | ✅ sys_user_role / sys_role_permission 用 delete()（无 deleted_at） |
| 禁止 JSON 列类型 | ✅（本次无 JSON 字段） |
| 禁止 MySQL 专属 SQL | ✅（TypeORM QueryBuilder + Repository API） |
| 不开启 synchronize | ✅ |
| 不新增迁移 | ✅（复用五张 RBAC 表，无新 DDL） |

---

## 五、权限代码

本阶段涉及的权限码（将在数据库初始化数据中预置）：

| permissionCode | 说明 |
|---|---|
| `system:user:read` | 查看用户列表/详情 |
| `system:user:create` | 创建用户 |
| `system:user:update` | 编辑用户信息/状态 |
| `system:user:delete` | 删除用户 |
| `system:user:reset-password` | 重置用户密码 |
| `system:role:read` | 查看角色列表 |
| `system:role:create` | 创建角色 |
| `system:role:update` | 编辑角色信息 |
| `system:role:delete` | 删除角色 |
| `system:role:assign-permissions` | 为角色分配权限 |

---

## 六、响应结构

所有接口经 `ResponseInterceptor` 统一包装后返回标准结构（见 CLAUDE.md §3）。

**用户列表响应（GET /api/admin/system/users）data 字段**：

```json
{
  "list": [
    {
      "id": "uuid",
      "username": "admin",
      "realName": "管理员",
      "mobile": null,
      "email": null,
      "status": "active",
      "lastLoginAt": "2026-06-01T10:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "roles": ["SUPER_ADMIN"]
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

**角色详情响应**（含 permissions 数组）：

```json
{
  "id": "uuid",
  "roleCode": "CONTENT_EDITOR",
  "roleName": "内容编辑员",
  "description": null,
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "permissions": [
    {
      "id": "uuid",
      "permissionCode": "system:user:read",
      "permissionName": "用户查看",
      "moduleCode": "system"
    }
  ]
}
```

---

## 七、测试情况

### 7.1 测试结构

| 测试组 | 用例数 |
|---|---|
| UsersService 单元测试（list/getById/create/remove/disable/resetPassword） | 10 |
| RolesService 单元测试（list/create/remove/assignPermissions） | 9 |
| SystemModule HTTP 集成测试（Users + Roles 接口） | 12 |
| **本文件合计** | **31** |
| 原有 auth.spec.ts / stats.spec.ts / database-config.spec.ts | 126 |
| **全项目合计** | **157** |

### 7.2 关键测试场景

- `remove()` — 删除自己 → 403
- `remove()` — 删除最后一个有效 SUPER_ADMIN → 403
- `remove()` — 删除普通用户 → softDelete 调用
- `disable()` — 禁用自己 → 403
- `disable()` — 禁用最后一个 SA → 403
- `create()` — 用户名已存在 → 409
- `assignPermissions()` — 无效 permissionId → 404
- `assignPermissions()` — 空数组 → 清空权限，事务调用
- `assignPermissions()` — 正常分配 → 事务调用，返回角色详情
- HTTP：无 token → 401
- HTTP：参数校验失败 → 400（密码过短、非法 roleCode）
- HTTP：SUPER_ADMIN 通配权限访问 → 200

### 7.3 测试隔离注意事项

单元测试使用 `jest.resetAllMocks()` 而非 `jest.clearAllMocks()`，原因：

`clearAllMocks()` 只清空 `mock.calls`/`mock.results` 等历史记录，但**不清空 `mockResolvedValueOnce` 队列**。若某个测试向 mock 入队了一个值但该代码路径未实际消费它（例如 `attachPermissions` 在 `rolePerms = []` 时短路，不调用 `permRepo.find`），该值会泄漏给下一个测试，导致序列错位。

`resetAllMocks()` 清空队列，保证每个测试从干净状态开始。需要跨测试持久的 mock 实现（如 `mockDataSource.transaction`）在 `beforeEach` 中通过 `mockImplementation()` 重新注册。

---

## 八、模块依赖关系

```
AppModule
  └── AdminApiModule
        ├── AuthModule        (JwtAuthGuard, PermissionsGuard, AuthService)
        └── SystemModule (新增)
              ├── UsersService   → TypeORM: SysUser, SysRole, SysUserRole
              └── RolesService   → TypeORM: SysRole, SysPermission, SysRolePermission,
                                            SysUserRole, DataSource (事务)
```

**模块边界保证**：`SystemModule` 与 `AuthModule` 之间无横向 Service import。两者共享相同的数据库实体，但通过 TypeORM Repository 各自独立注入。

---

## 九、操作日志预留

业务写操作均在关键路径写入 `this.logger.log(...)` 日志。待 `sys_operation_log` 表在后续步骤按 `database.md` 规范定义后，可在此处追加数据库写入。**本阶段不自行设计 `sys_operation_log` 表结构**。

---

## 十、验证结果

```
# 后端
npm run type-check      →  ✅ 0 errors
npm run build           →  ✅ nest build 成功
npm test -- --runInBand →  ✅ 157/157 通过
npm run migration:show  →  ✅ [X] 4 CreateRbacTables1749686400000（已执行，无新迁移）

# kiosk-app（验证无回归）
npm run build           →  ✅ 53 modules, built in 1.80s

# admin-web（验证无回归）
npm run type-check      →  ✅ 0 errors
npm run build           →  ✅ 25 modules, built in 856ms
```

---

## 十一、剩余风险与待处理事项

| 事项 | 优先级 | 说明 |
|---|---|---|
| `sys_permission` 初始数据未写入迁移 | 中 | 权限码已在本文档定义，需在下一个迁移文件中预置 seed 数据 |
| `sys_operation_log` 未实现 | 低 | 待 database.md 中完整字段设计后追加 |
| 用户-角色关联接口缺失 | 中 | 本次未实现 PUT /api/admin/system/users/:id/roles，需按 api-spec.md 补充 |
| ContentModule | 下一步 | Step 5 待实现 |
| PublishModule | 下一步 | Step 6 待实现 |
| admin-web 系统管理页面 | 下一步 | 骨架已就绪，功能页面待建设 |

---

## 十二、进入 Step 5 ContentModule 的条件评估

| 检查项 | 状态 |
|---|---|
| RBAC 基础表可用 | ✅ |
| 用户与角色 CRUD 可用 | ✅ |
| 角色权限分配事务可用 | ✅ |
| 最后一个 SA 保护生效 | ✅ |
| 三端构建全绿 | ✅ |
| 157/157 测试通过 | ✅ |
| 无新 DDL（未破坏现有迁移） | ✅ |

**结论：SystemModule 第一阶段闭环，具备进入 Step 5 ContentModule 的条件。**
