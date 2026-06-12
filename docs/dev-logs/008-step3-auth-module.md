# 008 · Step 3 — AuthModule JWT 认证与 RBAC 鉴权

**交付日期**：2026-06-12
**状态**：✅ 完成

---

## 一、本次目标

在不破坏已有 `/api/public/*` 接口的前提下，实现管理端认证与基础鉴权：

- `POST /api/admin/auth/login` — 用户名 + 密码登录，返回 JWT
- `POST /api/admin/auth/logout` — 退出登录（客户端主动丢弃 Token，服务端无黑名单）
- `GET  /api/admin/auth/profile` — 返回当前用户信息、角色列表、权限码列表
- 全局 `JwtAuthGuard`：所有路由默认需要合法 JWT，`@Public()` 装饰器豁免
- `PermissionsGuard` + `@RequirePermissions()`：声明式权限控制
- `SUPER_ADMIN` 角色拥有通配符权限 `['*']`，跳过所有权限检查
- 每次请求均查库验证用户状态，令牌签发后禁用/删除的用户立即失效

---

## 二、交付范围（禁止项确认）

| 禁止项 | 验证 |
|---|---|
| 不得新增 Token 黑名单表 | ✅ 退出登录为客户端行为，服务端无新表 |
| 不得开启 `synchronize: true` | ✅ DatabaseModule 中已禁止 |
| 不得使用 ENUM / JSON 类型 / 触发器 | ✅ 无上述数据库特性 |
| 不得破坏 `/api/public/*` 接口 | ✅ 三个 PublicApi 控制器均标注 `@Public()` |
| 不实现 SystemModule CRUD、登录页面、内容管理 | ✅ 本次仅实现 AuthModule |
| 生产环境不得默认绕过 SSL 证书验证 | ✅ Step 2 遗留，`rejectUnauthorized` 默认 `true` |
| Token 不得含 `password_hash` / `mobile` / `email` | ✅ JwtPayload 仅含 `sub`, `username` |
| 日志不得记录密码、完整 Token 或 password_hash | ✅ 日志只含 `id`, `username` |

---

## 三、新增文件清单

```
backend/src/
├── auth/
│   ├── auth.module.ts                          新建
│   ├── auth.service.ts                         新建
│   ├── decorators/
│   │   ├── public.decorator.ts                 新建
│   │   └── require-permissions.decorator.ts    新建
│   ├── dto/
│   │   ├── login.dto.ts                        新建
│   │   └── auth-response.dto.ts                新建
│   └── guards/
│       ├── jwt-auth.guard.ts                   新建
│       └── permissions.guard.ts                新建
├── admin-api/
│   ├── admin-api.module.ts                     新建
│   └── controllers/
│       └── auth.controller.ts                  新建
└── app.module.ts                               修改（注册全局 JwtAuthGuard）

backend/src/public-api/controllers/
├── home.controller.ts                          修改（添加 @Public()）
├── service-guide.controller.ts                 修改（添加 @Public()）
└── stats.controller.ts                         修改（添加 @Public()）

backend/test/
└── auth.spec.ts                                新建（35 个测试用例）

backend/.env.example                            修改（添加 JWT_SECRET / JWT_EXPIRES_IN）
CLAUDE.md                                       修改（更新开发状态）
```

---

## 四、关键设计决策

### 4.1 JWT 负载设计

```typescript
// JwtPayload — 仅含最小必要字段
interface JwtPayload {
  sub: string;      // user.id (UUID)
  username: string;
  iat?: number;
  exp?: number;
}
```

Token 中不携带角色、权限、`password_hash`、手机号、邮箱。每次请求时通过 `validateUserWithRoles()` 实时查库获取最新状态。

### 4.2 全局守卫注册

```typescript
// app.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
]
```

通过 `APP_GUARD` 在全局注册，所有路由默认受保护。`@Public()` 装饰器（`SetMetadata('isPublic', true)`）豁免指定路由。

### 4.3 每次请求验证用户状态

```typescript
// jwt-auth.guard.ts — 令牌验证通过后，立即查库
const user = await this.authService.validateUserWithRoles(payload.sub);
if (!user) throw new UnauthorizedException();
```

`validateUserWithRoles` 查询 `WHERE id = ? AND status = 'active'`，TypeORM 软删除自动追加 `deleted_at IS NULL`。用户在令牌存续期间被禁用或逻辑删除后，下一次请求立即返回 401。

### 4.4 SUPER_ADMIN 通配符权限

```typescript
// auth.service.ts
async getUserPermissions(userId: string, roles: string[]): Promise<string[]> {
  if (roles.includes('SUPER_ADMIN')) return ['*'];
  // ...其他角色走正常权限查询
}
```

`PermissionsGuard` 中，`user.roles.includes('SUPER_ADMIN')` 时直接放行，不再查 `sys_role_permission`。

### 4.5 退出登录策略

服务端不维护 Token 黑名单（禁止新增此类表）。`POST /api/admin/auth/logout` 是服务端无操作的哑端点，客户端负责删除本地存储的 Token。预留钩子，待 `SystemModule` 实现后写入 `sys_login_log`。

### 4.6 生产环境 JWT_SECRET 强制检查

```typescript
// auth.module.ts
if (!secret) {
  if (nodeEnv === 'production') {
    Logger.error('JWT_SECRET is required in production. Refusing to start.', 'AuthModule');
    process.exit(1);
  }
  Logger.warn('JWT_SECRET is not set. Using insecure default (development only).', 'AuthModule');
}
```

开发环境使用明示不安全的默认值并打印警告；生产环境缺少 `JWT_SECRET` 时直接 `process.exit(1)`。

### 4.7 密码安全

```typescript
// auth.service.ts
const passwordValid = await bcryptjs.compare(dto.password, user.passwordHash);
```

使用 `bcryptjs`（纯 JS，无 native 依赖）进行密码哈希比对。用户名或密码错误时统一返回 `'用户名或密码错误'`，不区分原因，防止用户名枚举。

---

## 五、接口规格

### POST /api/admin/auth/login

**无需 JWT（`@Public()`）**

请求体：
```json
{ "username": "admin", "password": "your-password" }
```

成功响应（200）：
```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "accessToken": "eyJ...",
    "userInfo": {
      "id": "uuid",
      "username": "admin",
      "realName": "管理员",
      "status": "active"
    },
    "permissions": ["*"]
  },
  "timestamp": 1749686400000,
  "requestId": "uuid"
}
```

失败响应：
- `400` — 请求体校验失败（字段缺失、类型错误、超长）
- `401` — 用户名不存在 / 密码错误 / 用户已禁用或逻辑删除

### POST /api/admin/auth/logout

**需要 JWT**

响应（200）：`data: null`

### GET /api/admin/auth/profile

**需要 JWT**

成功响应（200）：
```json
{
  "code": 0,
  "data": {
    "userInfo": { "id": "uuid", "username": "admin", "realName": "管理员", "status": "active" },
    "roles": ["SUPER_ADMIN"],
    "permissions": ["*"]
  }
}
```

---

## 六、测试覆盖

**测试文件**：`backend/test/auth.spec.ts`（35 个用例，全部通过）

| 测试分类 | 覆盖场景 |
|---|---|
| 登录成功 | 正确账号密码、SUPER_ADMIN 返回 `['*']` |
| 登录失败 | 用户不存在、密码错误、用户被禁用、用户已逻辑删除、缺字段、空字段 |
| JWT 守卫 | 缺少 Authorization 头、无效 Token、篡改签名、过期 Token、签发后用户被禁用、有效 Token 正常通过 |
| profile 接口 | 返回角色+权限、不返回 `passwordHash`/`mobile`/`email`、CONTENT_EDITOR 返回实际权限 |
| 退出登录 | 有效 Token 返回 200、无 Token 返回 401 |
| PermissionsGuard | SUPER_ADMIN 可访问任意受限路由、有权限的角色通过、无权限返回 403、无装饰器的路由可访问 |
| 路由隔离 | `@Public()` 路由无需 JWT、admin 路由无 JWT 返回 401 |
| 输入校验 | 额外字段被拒绝（forbidNonWhitelisted） |
| 回归 | 登录端点在无 JWT 时可达（守卫未拦截公开路由） |

---

## 七、验证结果

```
# 类型检查
npm run type-check  →  ✅ 0 errors

# 生产构建
npm run build       →  ✅ 编译成功

# 单元 / 集成测试
npm test -- --runInBand
Test Suites: 3 passed, 3 total
Tests:       105 passed, 105 total  (含 auth.spec 35 + database-config 40 + stats 30)

# 迁移状态
npm run migration:show
[X] 4 CreateRbacTables1749686400000  （迁移已在当前开发数据库执行并记录）

# kiosk-app 构建
cd kiosk-app && npm run build  →  ✅ 53 modules, built in 1.78s

# admin-web 构建
cd admin-web && npm run type-check && npm run build  →  ✅ 25 modules, built in 861ms
```

---

## 八、环境变量变更

`.env.example` 新增：

```dotenv
# JWT 配置
JWT_SECRET=CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_PRODUCTION
JWT_EXPIRES_IN=8h
```

- **生产环境**：`JWT_SECRET` 必填，缺少则拒绝启动（`process.exit(1)`）
- **开发环境**：未设置时使用不安全默认值并打印 WARN 日志

---

## 九、遗留说明

| 事项 | 说明 |
|---|---|
| `sys_login_log` 写入 | 待 Step 4 SystemModule 实现后在 `logout` / `login` 中补充 |
| HighGo 真实连接验证 | 需待生产环境数据库就绪后执行迁移，本次仅 mock 数据库测试 |
| 管理端登录页面 | admin-web 前端页面在 Step 3 范围外，待后续建设 |
| Token 续期 / 刷新 | 一期不实现，客户端 Token 过期后重新登录 |

---

## 十、下一步（Step 4）

按 CLAUDE.md 开发计划，Step 4 为 **SystemModule**：

- 用户管理 CRUD（`/api/admin/system/users`）
- 角色管理 CRUD（`/api/admin/system/roles`）
- 权限管理（预置权限码，管理员可分配给角色）
- 操作日志 (`sys_operation_log`)
- 登录日志 (`sys_login_log`)
- 系统参数 (`sys_param`)
