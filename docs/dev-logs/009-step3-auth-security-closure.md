# 009 · Step 3 安全补丁 — AuthModule 审查修复闭环

**交付日期**：2026-06-12
**基于**：008-step3-auth-module.md 审查发现的 5 项安全问题
**状态**：✅ 完成

---

## 一、修复清单

| # | 问题 | 文件 | 状态 |
|---|---|---|---|
| 1 | PermissionsGuard 未全局注册 | `app.module.ts` | ✅ 已修复 |
| 2 | 禁用/删除角色权限泄漏 | `auth.service.ts` | ✅ 已修复 |
| 3 | 登录成功未更新 last_login_at | `auth.service.ts` | ✅ 已修复 |
| 4 | JWT_SECRET 校验不足（占位符/过短） | `auth.module.ts` + 新增 util | ✅ 已修复 |
| 5 | 008 文档迁移状态描述错误 | `008-step3-auth-module.md` | ✅ 已修复 |

---

## 二、修复文件清单

```
backend/src/
├── app.module.ts                               修改（注册第二个 APP_GUARD）
├── auth/
│   ├── auth.service.ts                         修改（getActiveRoles 统一过滤 + last_login_at）
│   ├── auth.module.ts                          修改（加强 JWT_SECRET 校验）
│   └── utils/
│       └── jwt-secret.util.ts                  新建（可测试的弱密钥判断逻辑）
backend/test/
└── auth.spec.ts                                修改（新增 19 个测试用例，共 124 个）
docs/dev-logs/
└── 008-step3-auth-module.md                    修改（迁移状态描述纠错）
```

---

## 三、修复详情

### 3.1 全局注册 PermissionsGuard（Fix 1）

**原问题**：`AppModule` 仅注册 `JwtAuthGuard` 为 `APP_GUARD`，`PermissionsGuard` 只存在于测试代码的手动 `useGlobalGuards()` 中。真实应用中 `@RequirePermissions()` 装饰器完全不生效。

**修复方案**：

```typescript
// app.module.ts
providers: [
  // Guard 执行顺序由声明顺序决定（NestJS APP_GUARD）
  { provide: APP_GUARD, useClass: JwtAuthGuard },   // ① 身份认证
  { provide: APP_GUARD, useClass: PermissionsGuard }, // ② 权限判断
],
```

**执行顺序保证**：NestJS 按 `providers` 数组顺序执行 `APP_GUARD`。`JwtAuthGuard` 先于 `PermissionsGuard` 运行，确保 `request.user` 在权限检查前已就位。`@Public()` 路由由 `JwtAuthGuard` 豁免，`PermissionsGuard` 遇到无 `@RequirePermissions()` 的路由直接放行。

### 3.2 统一活跃角色过滤逻辑（Fix 2）

**原问题**：`getUserPermissions()` 内部直接查询 `sys_user_role` 获取全部 role_id，再查询对应权限——不区分角色是否 `status='disabled'` 或已软删除，也不验证 `roleCode` 是否在允许集合内。与 `getUserRoleCodes()` 的过滤逻辑存在两套不一致规则，禁用或删除角色的权限可能泄漏。

**修复方案**：提取 `private async getActiveRoles(userId)` 作为单一数据源：

```typescript
private async getActiveRoles(userId: string): Promise<SysRole[]> {
  const userRoles = await this.userRoleRepo.find({ where: { userId } });
  if (userRoles.length === 0) return [];

  const roleIds = userRoles.map(ur => ur.roleId);
  const roles = await this.roleRepo.find({
    where: { id: In(roleIds), status: 'active' },
    // TypeORM @DeleteDateColumn: 自动追加 deleted_at IS NULL
  });
  return roles.filter(r => ALLOWED_ROLES.has(r.roleCode));
}
```

三重过滤：① `status = 'active'`（禁用角色排除）② TypeORM 软删除（逻辑删除排除）③ `ALLOWED_ROLES` 白名单（未规划角色排除）

`getUserRoleCodes()` 和 `getUserPermissions()` 均通过此方法获取角色数据，逻辑一致：

| 场景 | getActiveRoles() 返回 | 结果 |
|---|---|---|
| 角色 `status=disabled` | `[]` | 无权限 |
| 角色已软删除 | `[]` | 无权限 |
| 角色 roleCode 不在白名单 | `[]` | 无权限 |
| 角色为 active SUPER_ADMIN | `[SUPER_ADMIN role]` | 通配权限 `['*']` |
| 角色为 disabled SUPER_ADMIN | `[]` | 无通配权限 |

**`getUserPermissions()` 签名**：方法签名为 `getUserPermissions(userId: string): Promise<string[]>`，无 `roles` 参数。SUPER_ADMIN 判断完全由内部 `getActiveRoles(userId)` 的数据库查询结果决定，调用方无法通过任何参数影响权限判定。

### 3.3 登录成功更新 last_login_at（Fix 3）

**修复位置**：`auth.service.ts` → `login()` 方法，密码验证通过后、生成 JWT 前：

```typescript
// 密码验证通过后立即更新（失败路径不会执行到此处）
await this.userRepo.update(user.id, { lastLoginAt: new Date() });
```

- 使用 TypeORM `Repository.update(id, partialEntity)` — 跨数据库兼容，无原生 SQL
- 密码错误、用户不存在、用户禁用三种失败路径均在此行之前抛出异常，不更新时间
- 不使用 `save()` 避免触发全字段更新和触发器（规避 HighGo 兼容性风险）

### 3.4 加强 JWT_SECRET 校验（Fix 4）

**原问题**：仅检查 `JWT_SECRET` 是否存在，`.env.example` 中的明显占位值或过短密钥仍可通过检查进入生产环境。

**新文件** `backend/src/auth/utils/jwt-secret.util.ts`：

```typescript
export const JWT_SECRET_MIN_LENGTH = 32;
export const JWT_SECRET_KNOWN_PLACEHOLDERS = new Set([
  'CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_PRODUCTION',
]);

export function isWeakJwtSecret(secret: string | undefined): boolean {
  if (!secret || secret.trim().length === 0) return true;
  if (secret.length < JWT_SECRET_MIN_LENGTH) return true;
  if (JWT_SECRET_KNOWN_PLACEHOLDERS.has(secret)) return true;
  return false;
}
```

**校验规则**：

| 场景 | 开发环境 | 生产环境 |
|---|---|---|
| `JWT_SECRET` 未设置 | WARN 日志，**忽略用户提供值，统一使用 `DEV_FALLBACK` 固定字符串** | `process.exit(1)` |
| 长度 < 32 字符 | WARN 日志，**忽略用户提供值，统一使用 `DEV_FALLBACK` 固定字符串** | `process.exit(1)` |
| 使用已知占位符 | WARN 日志，**忽略用户提供值，统一使用 `DEV_FALLBACK` 固定字符串** | `process.exit(1)` |
| 合法密钥（≥32 字符且非占位符） | 正常启动 | 正常启动 |

**安全约束**：日志信息不含密钥内容本身，仅描述拒绝原因（"missing, too short, or uses a placeholder value"）。

提取为独立 util 文件的原因：使校验逻辑可被单元测试直接覆盖，无需启动 NestJS 模块。

### 3.5 修正 008 文档迁移状态描述（Fix 5）

将 `008-step3-auth-module.md` 中：

> `[X] 4 CreateRbacTables1749686400000  （已记录，待连库执行）`

修正为：

> `[X] 4 CreateRbacTables1749686400000  （迁移已在当前开发数据库执行并记录）`

说明：TypeORM `migration:show` 输出中 `[X]` 表示迁移已执行并记录在数据库迁移历史表中，`[ ]` 表示尚未执行。原描述"待连库执行"与实际含义相反。

---

## 四、两个全局守卫的执行顺序

```
HTTP Request
    │
    ▼
[APP_GUARD #1] JwtAuthGuard.canActivate()
    ├─ @Public() → true（直接放行，跳过 PermissionsGuard）
    ├─ 无 Bearer Token → 401 UnauthorizedException
    ├─ Token 无效/过期/篡改 → 401 UnauthorizedException
    ├─ validateUserWithRoles() 查库
    │     ├─ 用户不存在/禁用/删除 → 401 UnauthorizedException
    │     └─ 有效 → request.user = AuthenticatedUser
    └─ true → 继续
    │
    ▼
[APP_GUARD #2] PermissionsGuard.canActivate()
    ├─ 无 @RequirePermissions() → true（直接放行）
    ├─ SUPER_ADMIN in request.user.roles → true（通配放行）
    ├─ getUserPermissions() 查库（active 角色）
    │     ├─ 满足所有 required permissions → true
    │     └─ 缺少任一 permission → 403 ForbiddenException
    └─ true → 继续
    │
    ▼
Controller Handler
```

---

## 五、active 角色权限过滤规则

`getActiveRoles(userId)` 是权限系统的唯一入口，三层过滤不可绕过：

```
sys_user_role (userId = ?)
    │
    ▼ IN(roleIds)
sys_role WHERE status = 'active'  ← 过滤 disabled 角色
         AND deleted_at IS NULL    ← TypeORM 自动追加，过滤软删除角色
    │
    ▼ filter(roleCode)
ALLOWED_ROLES = { SUPER_ADMIN, CONTENT_EDITOR, PUBLISH_REVIEWER }
    │
    ▼
getActiveRoles() → SysRole[]   （只含有效、已知角色）
```

---

## 六、last_login_at 更新行为

| 事件 | last_login_at | 说明 |
|---|---|---|
| 用户不存在（findOne 返回 null） | 不更新 | login() 在 update() 之前抛出 401 |
| 用户 status=disabled（findOne 返回 null） | 不更新 | 同上 |
| 用户已逻辑删除（findOne 返回 null） | 不更新 | 同上 |
| 密码错误（bcrypt.compare 返回 false） | 不更新 | login() 在 update() 之前抛出 401 |
| 密码正确、用户 active | 更新为 `new Date()` | userRepo.update(id, { lastLoginAt: new Date() }) |

---

## 七、JWT_SECRET 生产校验规则

| 条件 | 判定 | 生产行为 |
|---|---|---|
| 未设置（undefined / 空串 / 空白） | 弱 | `process.exit(1)` |
| 长度 < 32 字符 | 弱 | `process.exit(1)` |
| 等于已知占位符 | 弱 | `process.exit(1)` |
| ≥ 32 字符且不是占位符 | 强 | 正常启动 |

最小长度 32 字符来自 HMAC-SHA256 的推荐密钥长度（256 bit = 32 byte）。

---

## 八、真实应用配置测试结果

### 8.1 AppModule 守卫注册验证（反射检查）

```
AppModule — APP_GUARD provider registration
  ✅ registers JwtAuthGuard as first APP_GUARD and PermissionsGuard as second
```

通过 `Reflect.getMetadata('providers', AppModule)` 直接检查生产 `AppModule` 的元数据，
不可由测试代码手动安装守卫来伪造。

### 8.2 功能性验证

全部 124 个测试用例通过：

```
Test Suites: 3 passed, 3 total
Tests:       124 passed, 124 total
```

新增 19 个用例（相比 008 的 105 个）：

| 新增测试分类 | 用例数 |
|---|---|
| AppModule APP_GUARD 注册反射检查 | 1 |
| last_login_at 更新行为（成功/失败/用户不存在） | 3 |
| active 角色过滤（禁用/删除/未知角色） | 7 |
| JWT_SECRET 弱密钥判断 | 8 |
| **共计新增** | **19** |

---

## 九、三端构建结果

```
# backend
npm run type-check  →  ✅ 0 errors
npm run build       →  ✅ nest build 成功
npm test -- --runInBand  →  ✅ 49/49 通过（Step 3 阶段完成后）
npm run migration:show   →  [X] 4 CreateRbacTables1749686400000（已执行）

# kiosk-app
npm run build  →  ✅ 53 modules, built in 1.79s

# admin-web
npm run type-check  →  ✅ 0 errors
npm run build       →  ✅ 25 modules, built in 893ms
```

---

## 十、HighGo 未实连验证说明

本次修复全部为应用层代码变更（守卫注册、服务逻辑、JWT 校验），无数据库 DDL 变动。

- 数据库迁移文件未修改（`1749686400000-CreateRbacTables.ts` 不变）
- 迁移已在开发 MySQL 数据库执行并记录（`[X]`）
- HighGo 生产环境实连验证仍待生产数据库就绪后执行（延续自 007 的说明）
- 本次修复不引入任何 MySQL 专属 SQL，兼容性风险不变

---

## 十一、剩余风险

| 风险 | 等级 | 说明 |
|---|---|---|
| `sys_login_log` 未写入 | 低 | 待 Step 4 SystemModule 实现，已在 logout/login 预留注释 |
| HighGo 真实连接未验证 | 低 | 生产环境部署前需执行迁移冒烟测试 |
| Token 无续期机制 | 低 | 一期设计限制，客户端 Token 过期后重新登录，已知风险 |
| admin-web 登录页面未实现 | 低 | Step 3 范围外，待后续建设 |
| 每次请求查库验证用户（validateUserWithRoles） | 信息 | 性能权衡点；Step 4 可评估引入内存缓存（需配套缓存失效机制） |

---

## 十二、进入 Step 4 SystemModule 的条件评估

| 检查项 | 状态 |
|---|---|
| AuthModule 身份认证可用 | ✅ |
| 全局 JwtAuthGuard 保护所有 admin 接口 | ✅ |
| 全局 PermissionsGuard 声明式权限控制 | ✅ 已修复 |
| RBAC 角色过滤无泄漏 | ✅ 已修复 |
| 生产环境 JWT_SECRET 强制校验 | ✅ 已修复 |
| 登录时间记录 | ✅ 已修复 |
| `/api/public/*` 接口不受影响 | ✅ |
| 三端构建全绿 | ✅ |
| 测试覆盖关键安全场景 | ✅ 124/124 |

**结论：AuthModule 安全补丁全部闭环，具备进入 Step 4 SystemModule 的条件。**
