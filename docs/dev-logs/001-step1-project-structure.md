# Step 1 交付报告 — 工程结构初始化

日期：2026-06-11

---

## 本次目标

- 重命名 `frontend/` 为 `kiosk-app/`
- 创建 `admin-web/` 空工程目录骨架
- 重建 `backend/` 为 NestJS 工程
- 实现 CommonModule（统一响应、错误码、全局异常过滤器、请求 ID）
- 调整 `deploy/docker-compose.yml` 路径
- 创建根目录 `CLAUDE.md`

---

## 修改文件清单

| 操作 | 文件 |
|---|---|
| git mv | `frontend/` → `kiosk-app/`（含所有子文件） |
| 新建（备份） | `backend/_prototype/index.fastify.ts` |
| 完整重写 | `backend/package.json` |
| 完整重写 | `backend/tsconfig.json` |
| 新建 | `backend/tsconfig.build.json` |
| 新建 | `backend/nest-cli.json` |
| 更新 | `backend/Dockerfile`（CMD 改为 `dist/main`，npm i 改为 npm ci） |
| 新建 | `backend/src/main.ts` |
| 新建 | `backend/src/app.module.ts` |
| 新建 | `backend/src/common/common.module.ts` |
| 新建 | `backend/src/common/constants/error-codes.ts` |
| 新建 | `backend/src/common/dto/response.dto.ts` |
| 新建 | `backend/src/common/dto/page-result.dto.ts` |
| 新建 | `backend/src/common/dto/query-page.dto.ts` |
| 新建 | `backend/src/common/interceptors/response.interceptor.ts` |
| 新建 | `backend/src/common/filters/http-exception.filter.ts` |
| 新建（骨架） | `admin-web/package.json` |
| 新建（骨架） | `admin-web/tsconfig.json` |
| 新建（骨架） | `admin-web/vite.config.ts` |
| 新建（骨架） | `admin-web/index.html` |
| 新建（骨架） | `admin-web/src/main.ts` |
| 新建（骨架） | `admin-web/src/App.vue` |
| 新建（目录占位） | `admin-web/src/api/.gitkeep` |
| 新建（目录占位） | `admin-web/src/stores/.gitkeep` |
| 新建（目录占位） | `admin-web/src/views/.gitkeep` |
| 新建（目录占位） | `admin-web/src/components/.gitkeep` |
| 新建（目录占位） | `admin-web/src/router/.gitkeep` |
| 更新 | `deploy/docker-compose.yml`（`frontend` → `kiosk-app`，卷名 `frontend_dist` → `kiosk_dist`，预留 admin-web 注释块） |
| 更新 | `kiosk-app/Dockerfile`（`/frontend_dist` → `/kiosk_dist`） |
| 新建 | `CLAUDE.md`（根目录，固化三端工程结构、数据库规范、接口前缀、群众端约束、审核发布规则） |

---

## 完成后目录结构

```
touch-kiosk-proto/
├── CLAUDE.md
├── backend/
│   ├── _prototype/
│   │   └── index.fastify.ts        ← Fastify 原型备份，不参与构建
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── common/
│   │       ├── common.module.ts
│   │       ├── constants/
│   │       │   └── error-codes.ts
│   │       ├── dto/
│   │       │   ├── response.dto.ts
│   │       │   ├── page-result.dto.ts
│   │       │   └── query-page.dto.ts
│   │       ├── filters/
│   │       │   └── http-exception.filter.ts
│   │       └── interceptors/
│   │           └── response.interceptor.ts
│   ├── dist/                       ← 构建产物（已验证）
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.build.json
├── kiosk-app/                      ← 原 frontend/ 重命名，内容完整保留
│   └── src/...
├── admin-web/                      ← 新建，骨架
│   ├── src/
│   │   ├── api/
│   │   ├── stores/
│   │   ├── views/
│   │   ├── components/
│   │   ├── router/
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── api-spec.md
│   └── dev-logs/
│       └── 001-step1-project-structure.md  ← 本文件
└── deploy/
    ├── docker-compose.yml
    └── nginx.conf
```

---

## CommonModule 实现说明

### 统一响应格式

所有接口通过 `ResponseInterceptor` 自动包装为：

```json
{
  "code": 0,
  "message": "成功",
  "data": { ... },
  "timestamp": 1700000000000,
  "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

实现文件：`src/common/interceptors/response.interceptor.ts`

- 在 `next.handle()` 执行前生成 UUID 并写入 `req.requestId`
- 通过 RxJS `map` 算子包装成功响应

### 全局异常过滤器

`HttpExceptionFilter`（`@Catch()` 捕获全部异常）处理逻辑：

- `HttpException`：取 HTTP status 作为 code，解析 message（含 ValidationPipe 多行错误合并）
- 其他未知异常：code=500，日志记录 stack trace
- 统一格式：`{ code, message, data: null, timestamp, requestId }`

实现文件：`src/common/filters/http-exception.filter.ts`

### 错误码常量

文件：`src/common/constants/error-codes.ts`

| code | 含义 |
|---|---|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或登录已过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 状态冲突 |
| 500 | 服务器内部错误 |
| 502 | 外部接口调用失败 |
| 503 | 服务暂不可用 |
| 504 | 外部接口超时 |

### 分页工具

- `page-result.dto.ts`：`PageResult<T>` 接口 + `createPageResult()` 工厂函数
- `query-page.dto.ts`：`QueryPageDto`，含 `page`/`pageSize` 参数校验装饰器

---

## 验证结果

| 验证项 | 命令 | 结果 |
|---|---|---|
| TypeScript 类型检查 | `npm run type-check` | ✅ 零错误 |
| NestJS 生产构建 | `npm run build` | ✅ 通过 |
| 构建产物入口 | `dist/main.js` | ✅ 存在 |

---

## 过程中修复的问题

| 问题 | 原因 | 修复方式 |
|---|---|---|
| `_prototype` 被纳入类型检查 | `tsconfig.build.json` 的 exclude 路径写成了 `src/**/_prototype/**`，实际路径是根目录下 `_prototype/` | 改为 `"_prototype"` |
| `HttpExceptionFilter` 构造参数类型错误 | 误将 `AbstractHttpAdapter` 传入期望 `HttpAdapterHost` 的构造函数 | 去掉 `HttpAdapterHost` 依赖，直接使用 Express `Response.status().json()` |
| `backend/node_modules` 权限拒绝 | 原 node_modules 由 root 用户创建 | 用户手动 `sudo rm -rf`，重新 `npm install` |

---

## 下一步：Step 2

目标：接入 TypeORM + MySQL，创建 P0 数据库实体与迁移。

需要提前确认：

- 本地 MySQL 连接信息（host / port / database / user / password）
- 是否使用 `.env` 文件管理配置（推荐）
