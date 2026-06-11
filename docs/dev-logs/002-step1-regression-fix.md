# 002 · Step 1 功能回归修复

**日期**：2026-06-11  
**分支**：main  
**目标**：修复 Step 1 工程重建后 kiosk-app 无可用后端的功能回归，补全公开接口层，修复 kiosk-app 内存泄漏，迁移接口前缀。

---

## 1. 问题根因

Step 1 将 backend 从 Fastify 单文件原型重建为空 NestJS 骨架，所有原型路由（`/api/config`、`/api/depts` 等）同时消失。kiosk-app 仍指向旧路径，导致所有页面无法加载数据。

---

## 2. 后端变更（backend/）

### 新增模块

| 目录 | 模块 | 职责 |
|---|---|---|
| `src/home-config/` | `HomeConfigModule` | 提供首页配置 mock 数据 |
| `src/service-guide/` | `ServiceGuideModule` | 提供部门、主题、事项列表、事项详情 mock 数据 |
| `src/stats/` | `StatsModule` | 记录点击埋点（日志输出，无存储） |
| `src/public-api/` | `PublicApiModule` | 挂载三个 Controller，暴露 `/api/public/*` 路由 |

### 路由映射

| 方法 | 路由 | 旧路径 |
|---|---|---|
| GET | `/api/public/home/config` | `/api/config` |
| GET | `/api/public/service-guide/depts` | `/api/depts` |
| GET | `/api/public/service-guide/themes` | `/api/topics` |
| GET | `/api/public/service-guide/items` | `/api/items` |
| GET | `/api/public/service-guide/items/:id` | `/api/items/:id` |
| POST | `/api/public/stats/click` | `/api/metrics/click` |

所有路由通过 `app.setGlobalPrefix('api')` + `@Controller('public/...')` 生成，不再扩展旧 `/api/*` 命名空间。

### mock 数据范围

- 4 个部门（d-001 … d-004）
- 4 个主题（t-001 … t-004）
- 6 个事项列表项（i-001 … i-006）
- 6 个事项详情（含材料、流程、地点、时间、温馨提示）

mock 数据直接写在 Service 类中，与 `_prototype/` 完全隔离，`tsconfig.build.json` 已排除 `_prototype/` 目录。

---

## 3. kiosk-app 变更

### `src/api/client.ts`（重写）

- AbortController 8 s 超时，超时后抛出「网络请求超时，请稍后重试」
- 网络故障抛出「网络连接失败，请检查网络后重试」
- 自动解包后端统一信封 `{code, data}`，`code !== 0` 时抛业务错误消息
- 导出 `apiGet<T>` / `apiPost<T>` 两个函数

### `src/api/endpoints.ts`（重写）

所有接口调用指向新的 `/api/public/*` 路径，参数命名保持不变（`deptId`/`topicId`/`hot` 等查询参数名不变，最小化页面组件改动）。

### `src/app/useIdleHome.ts`（重写）

**修复的内存泄漏**：
1. 事件监听器（click/touchstart/touchmove/scroll/keydown）不再只 add 不 remove
2. `setTimeout` 现在存储 ID，cleanup 函数调用 `window.clearTimeout` 后置 undefined
3. 函数返回 `() => void` cleanup 回调，调用方在 `onUnmounted` 中执行

### `src/App.vue`（重写）

- `cleanupIdle` 变量存储 `useIdleHome` 返回的 cleanup 函数
- `onUnmounted` 中调用 `cleanupIdle?.()`，确保 unmount 时清理定时器和事件监听器
- 时钟定时器（`window.setInterval`）同样在 `onUnmounted` 中清理

### `src/pages/Home.vue`（重写）

- 加载 `config.homeHotItems` 作为热门事项按钮
- 错误信息展示 `e.message`（即 client.ts 抛出的中文友好提示）

---

## 4. admin-web 变更

- 运行 `npm install` 生成 `package-lock.json`
- 新增 `src/env.d.ts`：补充 Vue SFC 类型声明（`declare module '*.vue'`），修复 type-check 报错

---

## 5. 验证结果

### type-check

```
backend   npm run type-check  ✅  无错误
admin-web npm run type-check  ✅  无错误
```

### build

```
backend   npm run build       ✅  dist/ 生成成功
kiosk-app npm run build       ✅  dist/ 生成成功（50 模块，99.49 kB gzip 38.23 kB）
admin-web npm run build       ✅  dist/ 生成成功（25 模块，61.91 kB gzip 24.85 kB）
```

### 接口烟测

```
GET  /api/public/home/config              → code:0  data:{title,subtitle,idleSeconds:90,...}
GET  /api/public/service-guide/depts      → code:0  data:[4条]
GET  /api/public/service-guide/themes     → code:0  data:[4条]
GET  /api/public/service-guide/items      → code:0  data:[6条]
GET  /api/public/service-guide/items/i-001→ code:0  data:{materials,steps,locationText,...}
GET  /api/public/service-guide/items/NOTEXIST → code:404 data:null message:"事项 NOTEXIST 不存在"
POST /api/public/stats/click              → code:0  data:{ok:true}
```

### 安全检查

```
kiosk-app 源码无旧 /api/* 路径残留  ✅
kiosk-app 源码无 /api/admin 路径    ✅
无 <input> 键盘触发                  ✅（页面全部使用 BigButton/BigCard 触摸按钮）
```

---

## 6. 遗留事项

- mock 数据将在 Step 2（TypeORM + MySQL 实体）后替换为真实数据库查询
- `ServiceGuideModule` 的数据服务方法签名（`getDepts/getTopics/getItems/getItemDetail`）已按照最终接口规范设计，Step 2 只需替换实现体，控制器层不需改动
- admin-web 页面尚未建设，将在后续步骤中推进
