# 政务公开触摸查询系统 — 项目接管分析报告

版本：V1.0 | 日期：2026-06-11

---

## 一、当前项目目录结构

```
touch-kiosk-proto/
├── backend/
│   ├── src/
│   │   └── index.ts            ← 全部后端逻辑，单文件，约 160 行
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts       ← fetch 封装
│   │   │   ├── endpoints.ts    ← API 调用函数
│   │   │   └── types.ts        ← 接口类型定义
│   │   ├── app/
│   │   │   ├── router.ts       ← Vue Router，6 条路由
│   │   │   └── useIdleHome.ts  ← 90 秒无操作回首页
│   │   ├── components/
│   │   │   ├── BigButton.vue
│   │   │   ├── BigCard.vue
│   │   │   └── BottomNav.vue
│   │   ├── pages/
│   │   │   ├── Home.vue
│   │   │   ├── DeptList.vue
│   │   │   ├── TopicList.vue
│   │   │   ├── ItemList.vue
│   │   │   ├── ItemDetail.vue
│   │   │   └── Help.vue
│   │   ├── styles/index.css
│   │   ├── App.vue
│   │   └── main.ts
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.html
│   └── Dockerfile
├── deploy/
│   ├── docker-compose.yml
│   └── nginx.conf
├── docs/                       ← 设计文档（本次接管参考依据）
│   ├── architecture.md
│   ├── database.md
│   └── api-spec.md
├── README.md
├── TECH_STACK.md
├── DEPLOY_SIMPLE.md
└── 政务公开触摸查询系统（一期）需求与架构确认稿.md
```

**缺失**：无 `kiosk-app/` 目录（frontend 是其雏形）；无 `admin-web/` 目录；CLAUDE.md 不存在。

---

## 二、已有代码现状

### 2.1 后端 `backend/`

**技术栈**：Fastify + TypeScript，单文件，无数据库，全量内存 Mock 数据。

现有接口：

| 接口 | 说明 |
|------|------|
| `GET /api/health` | 健康检查 |
| `GET /api/config` | 返回硬编码首页配置（含热门事项、底栏导航） |
| `GET /api/depts` | 部门列表，支持 `?hot=1&letter=X` |
| `GET /api/topics` | 主题列表，支持 `?hot=1` |
| `GET /api/items` | 事项列表，支持 `?deptId=&topicId=&hot=1` |
| `GET /api/items/:id` | 事项详情 |
| `POST /api/metrics/click` | 点击统计（仅写日志，不落库） |

关键问题：
- 框架是 Fastify，目标框架是 NestJS，不可复用
- 无数据库连接，无 ORM，无实体，无迁移
- 无认证，无 JWT，无 RBAC Guard
- 无模块拆分，所有逻辑在同一文件
- 接口路径均为 `/api/*`，与设计文档要求的 `/api/admin/*` 和 `/api/public/*` 双前缀不符
- 数据硬编码在代码里，重启即重置

### 2.2 群众端 `frontend/`

**技术栈**：Vue3 + TypeScript + Vite + Pinia（安装但未建 store）+ Vue Router + Tailwind CSS。

| 模块 | 状态 |
|------|------|
| 页面路由结构 | 6 条路由，办事指南查询路径完整 |
| 90s 空闲回首页 | 已实现，逻辑正确 |
| 底部四键导航 | 已实现（首页/返回/重来/帮助） |
| 三区布局（29vh顶/68vh主/底栏） | 已实现 |
| 禁选/禁 tap-highlight CSS | 已实现 |
| 大按钮/大卡片组件 | 已实现，符合触控尺寸规范 |
| API 类型层 | 结构清晰，types.ts 定义了核心类型 |
| fetch 封装 | 基础可用 |

缺失：
- 无 Capacitor（无法打 APK）
- 无 Pinia store（状态管理空壳）
- 无离线缓存逻辑
- 无断网友好提示组件
- 页面仅覆盖办事指南路径，缺少政策文件、公告、FAQ、窗口导航、宣传展示等全部其他内容类型
- 竖屏全屏沉浸 meta 不完整（缺 `maximum-scale=1`、`user-scalable=no`）
- API 层对接的是 `/api/*` 旧路径，需切换至 `/api/public/*`

### 2.3 管理端

**完全不存在**，需从零创建。

### 2.4 部署 `deploy/`

| 文件 | 状态 |
|------|------|
| docker-compose.yml | nginx + backend + frontend 三服务，结构可用 |
| nginx.conf | SPA 路由 + /api 反代，基础正确 |

缺失：
- 无 admin-web 的 Docker 服务定义
- nginx 未区分 `/api/public` 和 `/api/admin`
- 无静态文件目录挂载（图片上传本地存储预留）

---

## 三、当前代码与设计文档的差距

### 3.1 工程结构差距

| 设计文档要求 | 当前状态 | 差距 |
|---|---|---|
| `kiosk-app/` 目录 | `frontend/`（雏形） | 需重命名并大幅扩展 |
| `admin-web/` 目录 | 不存在 | 需从零创建 |
| `backend/` NestJS 模块化 | Fastify 单文件 Mock | 需完整重建 |
| `docs/` 目录 | 已存在 | 满足 |

### 3.2 后端模块差距

设计文档要求 14 个模块，当前均不存在：

| 设计模块 | 当前状态 |
|---|---|
| AuthModule（登录/JWT/登录日志） | 无 |
| SystemModule（用户/角色/权限/操作日志） | 无 |
| ContentModule（10 种内容类型） | 无 |
| PublishModule（草稿/审核/发布/回滚） | 无 |
| GuideConfigModule（部门/主题/高频事项配置） | 仅有硬编码 Mock 数据 |
| ServiceGuideModule（共享平台代理/缓存兜底） | 无 |
| HomeConfigModule（首页模块配置） | 仅有硬编码 config |
| NavigationModule（楼层/区域/窗口） | 无 |
| ShowcaseModule（模范先锋岗等宣传展示） | 无 |
| FileModule（图片上传/本地存储） | 无 |
| PublicApiModule（群众端公开接口） | 混在单文件，无隔离 |
| AdminApiModule（管理端接口，含鉴权） | 无 |
| StatsModule（访问/点击统计） | 仅打日志，不落库 |
| CacheModule（离线缓存） | 无 |
| CommonModule（统一响应/错误码/拦截器） | 无 |

### 3.3 数据库差距

设计文档定义了 20+ 张表，当前一张表都不存在：

| 表组 | 涉及表 |
|---|---|
| 权限模型 | sys_user、sys_role、sys_user_role、sys_permission、sys_role_permission |
| 内容管理 | content_category、content_item、content_version、content_relation |
| 审核发布 | publish_record |
| 办事指南配置 | guide_dept_mapping、guide_theme_mapping、guide_item_config、guide_api_cache |
| 首页配置 | home_config、home_module |
| 窗口导航 | nav_floor、nav_area、nav_window |
| 宣传展示 | showcase_item |
| 文件资源 | file_asset |
| 统计日志 | stat_page_view、stat_click_event、stat_api_log |
| 系统日志 | sys_operation_log、sys_login_log、sys_param |

### 3.4 API 路径差距

| 设计文档要求 | 当前实现 | 差距 |
|---|---|---|
| 管理端统一前缀 `/api/admin` | 无（不存在管理端接口） | 需全部新建 |
| 群众端统一前缀 `/api/public` | 当前是 `/api`（无分层） | 路径需重构 |
| 统一响应结构 `{ code, message, data, timestamp, requestId }` | 直接返回裸数据 | 需统一封装 |
| 分页结构 `{ list, total, page, pageSize }` | 无分页 | 需实现 |
| 错误码规范（0/400/401/403/404/409/500/502/503/504） | 无规范，直接 HTTP status | 需统一 |

### 3.5 群众端接口差距

| 设计文档要求接口 | 当前状态 |
|---|---|
| `GET /api/public/home/config` | 存在但路径不符，无分层数据 |
| `GET /api/public/service-guide/depts` | 存在对应功能，路径需调整 |
| `GET /api/public/service-guide/items/:itemId`（含 15 个规范字段） | 部分字段存在，结构不符规范 |
| `GET /api/public/content/policies` 等政策/公告/FAQ 接口 | 完全不存在 |
| `GET /api/public/navigation/*` 窗口导航接口 | 完全不存在 |
| `GET /api/public/showcase/*` 宣传展示接口 | 完全不存在 |
| `GET /api/public/cache/offline-package` | 完全不存在 |
| `POST /api/public/stats/page-view` | 无，当前 click 接口路径不符 |

---

## 四、可以保留的代码

### 前端（frontend/）

| 文件/模块 | 保留理由 |
|---|---|
| `src/app/useIdleHome.ts` | 90s 空闲逻辑正确，可直接复用 |
| `src/app/router.ts` | 路由结构合理，在原基础上扩展即可 |
| `src/api/client.ts` | fetch 封装简洁，升级为支持统一响应结构后可用 |
| `src/components/BigButton.vue` | 触控尺寸符合规范，直接复用 |
| `src/components/BigCard.vue` | 同上 |
| `src/components/BottomNav.vue` | 逻辑正确，可复用 |
| `src/App.vue` | 三区布局结构正确，细节需完善 |
| `src/styles/index.css` | 禁选/禁 tap-highlight 规则正确 |
| `src/main.ts` | 入口配置正确 |
| `vite.config.ts` | Vite 配置 + 代理正确，需更新代理路径 |
| `tsconfig.json` | strict 配置正确 |
| `index.html` | 基本正确，需补全屏 meta |
| `package.json` 中的 Vue3/Vite/Pinia/Router | 核心依赖版本合适，保留并新增 Capacitor |

### 部署（deploy/）

| 文件 | 保留理由 |
|---|---|
| `docker-compose.yml` | 整体结构正确，在此基础上增加 admin-web 服务和文件存储卷即可 |
| `nginx.conf` | 反代逻辑正确，需在此基础上增加 admin-web 配置块 |

---

## 五、建议重构的代码

### 后端（backend/）

| 文件 | 处理建议 |
|---|---|
| `src/index.ts` | **完整重建**。Fastify 替换为 NestJS，Mock 数据替换为数据库，单文件拆分为模块。其中 Mock 数据的字段结构可作为实体设计参考，不作代码复用 |
| `package.json` | **完整重建**。依赖从 Fastify 全部换为 NestJS 生态 |
| `tsconfig.json` | **按 NestJS 标准重建**（target 调整为 ES2020，需 experimentalDecorators 等） |
| `Dockerfile` | **微调**。构建命令从 `tsc` 改为 `nest build`，其余结构可保留 |

### 群众端（frontend/）

| 文件 | 处理建议 |
|---|---|
| `src/api/endpoints.ts` | **重写**。路径改为 `/api/public/*`，并解包统一响应结构 `{ code, data }` |
| `src/api/types.ts` | **扩展**。现有类型保留，大幅补充其他内容类型的响应结构 |
| `src/pages/Home.vue` | **重写**。当前仅有热门事项和按部门/主题查，需改为完整的首页模块化卡片布局 |
| `src/pages/ItemDetail.vue` | **重写**。字段结构需对齐设计文档规范的 15 个字段 |
| `src/pages/DeptList.vue`、`TopicList.vue`、`ItemList.vue` | **扩展改造**。路径和字段需对齐 `/api/public/service-guide/*` |
| `index.html` | **补充**。增加全屏沉浸相关 meta |

---

## 六、后续开发优先级

按 api-spec.md 中定义的 P0/P1/P2 优先级，结合三端依赖关系：

### P0（必须先做，其他一切依赖此基础）

1. 后端工程初始化：NestJS 项目脚手架、TypeORM + MySQL 接入、CommonModule
2. 数据库实体与迁移：P0 涉及的全部表
3. AuthModule：登录、JWT、Guard、登录日志
4. SystemModule：用户 CRUD、角色 CRUD、权限绑定
5. ContentModule：10 种内容类型的 CRUD
6. PublishModule：草稿→审核→发布→撤回→回滚流程
7. GuideConfigModule：部门映射、主题映射、高频事项配置
8. HomeConfigModule：首页模块配置
9. PublicApiModule：群众端 `/api/public/*` 接口层
10. 管理端 admin-web 基础框架：登录、用户管理、内容管理、审核发布界面

### P1（P0 完成后推进）

11. NavigationModule：楼层/区域/窗口
12. ShowcaseModule：宣传展示各类型
13. FileModule：图片上传与本地存储
14. StatsModule：页面访问与点击统计落库
15. CacheModule：离线数据包接口
16. ServiceGuideModule：大数据共享平台代理（依赖对接文档）
17. kiosk-app 全面改造：新增所有内容页面、Pinia store、离线缓存、断网提示
18. Capacitor 接入：配置 Android APK 构建

### P2（一期收尾 / 二期预研）

19. 统计分析管理界面
20. Capacitor 全屏沉浸/禁键盘插件调优
21. 后续扩展模块占位（AI/预约/统一认证，只留接口，不实现业务）

---

## 七、第一阶段建议先实现的模块

目标：**跑通管理端登录 → 内容编辑 → 审核发布 → 群众端展示的最小完整链路**。

```
Step 1  NestJS 工程初始化 + CommonModule（统一响应/错误码/异常过滤器）
        ↓
Step 2  TypeORM 接入 + P0 表实体创建 + 数据库迁移
        ↓
Step 3  AuthModule（登录/JWT/Guard）
        ↓
Step 4  SystemModule（用户/角色，先通超级管理员和内容编辑员两角色）
        ↓
Step 5  ContentModule（先支持"通知公告"和"FAQ"两种类型，跑通 CRUD）
        ↓
Step 6  PublishModule（跑通"直接发布"最短流程，暂不做多级审核）
        ↓
Step 7  HomeConfigModule（首页配置接口，群众端能拿到首页数据）
        ↓
Step 8  PublicApiModule（/api/public/home/config、/api/public/content/notices、/api/public/content/faqs）
        ↓
Step 9  admin-web 最小界面（登录页 + 通知公告 CRUD + 发布操作）
        ↓
Step 10 kiosk-app 对接（切换至 /api/public/ 路径，首页和公告/FAQ 页面联调）
```

完成上述 10 步后，系统具备完整的端到端最小闭环，后续各模块可独立并行推进。

---

## 八、工程拆分建议

**建议：保持单仓库（Monorepo），按目录严格隔离三个子工程。**

目标目录结构：

```
touch-kiosk-proto/
├── kiosk-app/          ← frontend/ 重命名 + 改造
├── admin-web/          ← 新建
├── backend/            ← 原地重建
└── docs/               ← 保留
```

不建议拆成三个独立 Git 仓库的理由：

| 考量 | 说明 |
|---|---|
| 类型共享 | backend 的 DTO/接口类型可供 kiosk-app 和 admin-web 参考，单仓库方便对齐 |
| 部署一致性 | deploy/ 目录可统一管理三端构建与部署配置 |
| 团队规模 | 一期小团队，多仓库同步成本高于收益 |
| 分支策略 | 单仓库一个 PR 就能保证三端一致性变更 |

建议同步调整：

- `frontend/` 目录重命名为 `kiosk-app/`，同步更新 `deploy/docker-compose.yml` 中的 `context` 路径
- 在根目录新增 `CLAUDE.md`，记录三端工程结构、数据库规范和编码约束
- 各子工程 `package.json` 中 `name` 字段对齐：`kiosk-app`、`admin-web`、`backend`

---

## 九、待确认事项

开始第一阶段前需确认：

1. `frontend/` 是否现在重命名为 `kiosk-app/`，还是等后续处理？
2. 本地开发 MySQL 是已有实例，还是通过 Docker 启动？
3. `backend/` 是否原地重建（覆盖），还是保留原型代码备份？
4. 是否现在创建 `CLAUDE.md` 固化开发规范（数据库约束、接口前缀、响应结构等）？
