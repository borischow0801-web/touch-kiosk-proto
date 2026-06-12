# CLAUDE.md

在每次会话开始时读取本文件，不可跳过。

---

## 1. 工程结构

本仓库为单仓库（Monorepo），包含三个子工程：

| 目录 | 用途 | 技术栈 |
|---|---|---|
| `backend/` | 统一后端服务 | NestJS · TypeScript · TypeORM · MySQL / HighGo |
| `kiosk-app/` | 群众端安卓 APK | Vue3 · TypeScript · Vite · Pinia · Capacitor |
| `admin-web/` | 管理端 Web | Vue3 · TypeScript · Vite · Element Plus · Pinia |
| `docs/` | 设计文档 | — |
| `deploy/` | Docker Compose + Nginx | — |

参考文档：

- `docs/architecture.md` — 系统架构
- `docs/database.md` — 数据库设计
- `docs/api-spec.md` — 接口规范

---

## 2. 数据库兼容规范

开发环境：MySQL 8。生产环境：HighGo（瀚高数据库）。

以下规则不得例外：

- **主键**：统一 `varchar(36)`，后端代码生成 UUID v4，禁止自增主键
- **状态字段**：使用 `varchar`，禁止使用数据库 `ENUM` 类型
- **布尔标志字段**：使用 `smallint`，仅允许 0 / 1（MySQL 8 与 HighGo 均兼容）
- **JSON 配置字段**：使用 `text` 列存储序列化后的 JSON 字符串，禁止使用 MySQL 的 JSON 类型
- **公共时间字段**：所有业务表必须包含 `created_at`、`updated_at`、`deleted_at`
- **逻辑删除**：通过 `deleted_at` 软删除，禁止物理删除业务数据
- **禁止使用 MySQL 专属特性**：存储过程、触发器、FULLTEXT、GROUP_CONCAT、JSON 操作符、SET 类型均不可用
- **使用标准 SQL**：标准 JOIN、标准聚合，保证迁移至 HighGo 时无需修改

### 本地数据库操作边界

- 开发库固定使用 `touch_kiosk_dev`，账号固定使用 `touch_kiosk_dev_user`
- 集成测试库固定使用 `touch_kiosk_test`，账号固定使用 `touch_kiosk_test_user`
- 禁止使用 `oms_db`、`mydb` 或任何其他已有项目数据库
- 禁止使用其他项目账号或 root 账号运行应用、迁移和测试
- 数据库与账号的创建、删除、授权和恢复由用户或 Codex 单独执行，Claude Code / Cursor 不得操作
- 破坏性测试必须同时校验固定测试库名、固定测试用户、显式确认值及 `touch_kiosk_test_guard` 所有权标记
- 数据库密码仅保存在未纳入版本控制的 `backend/.env`，不得写入源码、文档、日志或交付报告

---

## 3. 后端接口规范

所有接口分为两类，不得混用：

| 类别 | URL 前缀 | 是否需要登录 | 面向对象 |
|---|---|---|---|
| 管理端接口 | `/api/admin` | 必须（JWT） | admin-web |
| 群众端公开接口 | `/api/public` | 不需要 | kiosk-app |

### 统一响应格式

所有接口返回此格式：

```json
{
  "code": 0,
  "message": "成功",
  "data": { ... },
  "timestamp": 1700000000000,
  "requestId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

`code = 0` 表示成功，`code != 0` 表示失败。

### 分页响应格式

分页接口的 `data` 字段结构：

```json
{
  "list": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### 标准错误码

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

---

## 4. 群众端约束

kiosk-app 运行于 1080×1920 竖屏触摸屏，全程匿名使用。

**必须遵守**：

- 禁止使用任何会触发系统键盘的 `<input>` 或可聚焦元素
- 所有交互只用点击/触摸完成
- 页面三区布局：
  - 顶部 29vh：纯展示，不放可交互按钮
  - 中部 68vh：所有交互内容（按钮、列表、详情）
  - 底部固定：导航栏（首页 / 返回 / 重来 / 帮助）
- 90 秒无操作自动回首页，回首页时清理临时状态
- 断网或接口失败时显示友好提示，不允许白屏
- kiosk-app 禁止直接调用大数据共享平台接口，必须通过 backend Public API 中转

---

## 5. 内容审核发布流程

所有可发布内容共用以下状态机：

```
draft  →  pending  →  published
                ↓（驳回）
             rejected  →  draft
published  →  withdrawn  →  archived
```

状态值（varchar）：`draft`、`pending`、`published`、`rejected`、`withdrawn`、`archived`

支持的操作：

| 操作 | 路径 | 说明 |
|---|---|---|
| submit | draft → pending | 提交审核 |
| approve | pending → published | 审核通过 |
| reject | pending → rejected | 审核驳回 |
| direct-publish | draft → published | 直接发布（需权限） |
| withdraw | published → withdrawn | 撤回 |
| rollback | — → draft | 版本回滚为草稿 |

**每次发布操作必须在 `publish_record` 表写入记录。**

---

## 6. 版本管理规则

所有可发布内容类型（content_item、home_config、showcase_item 等）均支持版本管理：

- 编辑内容时，创建新的草稿版本，不覆盖已发布版本
- 主表的 `current_version_id` 字段指向当前生效的已发布版本
- `content_version` 表只追加，不删除历史版本
- 回滚操作将指定版本内容复制为新草稿，不改变历史记录

---

## 7. 后端模块边界

模块之间不得横向互相 import Service，数据流通过明确的依赖注入传递。

| 模块 | 职责 |
|---|---|
| `CommonModule` | 统一响应、错误码、异常过滤器、拦截器、通用 DTO |
| `AuthModule` | 登录、JWT、登录日志 |
| `SystemModule` | 用户、角色、权限、操作日志、系统参数 |
| `ContentModule` | 本地内容 CRUD（10 种类型） |
| `PublishModule` | 审核发布流程、版本回滚 |
| `GuideConfigModule` | 部门/主题/高频事项展示配置 |
| `ServiceGuideModule` | 大数据平台接口代理、缓存兜底 |
| `HomeConfigModule` | 首页模块配置 |
| `NavigationModule` | 楼层/区域/窗口 |
| `ShowcaseModule` | 宣传展示 |
| `FileModule` | 图片上传、本地存储 |
| `PublicApiModule` | `/api/public` 控制器层 |
| `AdminApiModule` | `/api/admin` 控制器层 |
| `StatsModule` | 点击量、页面访问统计 |
| `CacheModule` | 离线数据包 |

---

## 8. 角色定义

一期只有三个角色，role_code 字段值固定如下：

| role_code | 名称 | 权限 |
|---|---|---|
| `SUPER_ADMIN` | 超级管理员 | 所有权限 |
| `CONTENT_EDITOR` | 内容编辑员 | 创建/编辑内容草稿 |
| `PUBLISH_REVIEWER` | 审核发布员 | 审核和发布内容 |

---

## 9. 当前开发状态

| 子工程 / 模块 | 状态 |
|---|---|
| `backend/` NestJS 骨架 + CommonModule | ✅ 完成 |
| `backend/` HomeConfigModule（mock 数据） | ✅ 完成（Step 2 前置） |
| `backend/` ServiceGuideModule（mock 数据） | ✅ 完成（Step 2 前置） |
| `backend/` StatsModule（mock 数据） | ✅ 完成（Step 2 前置） |
| `backend/` PublicApiModule（`/api/public/*`） | ✅ 完成 |
| `backend/` TypeORM + MySQL/HighGo 双方言配置 | ✅ 完成（Step 2）|
| `backend/` 5 张 RBAC 基础表 + 外键迁移 | ✅ 完成（Step 2）|
| `backend/` AuthModule（JWT + RBAC 鉴权） | ✅ 完成（Step 3 + 安全闭环） |
| `backend/` AdminApiModule（`/api/admin/auth/*`） | ✅ 完成（Step 3 + 安全闭环） |
| `backend/` SystemModule（用户管理、角色管理、角色权限分配、安全闭环） | ✅ 完成（Step 4 Phase 1 + 安全闭环 + 迁移安全） |
| `backend/` ContentModule（分类/内容/版本/关联，管理端 CRUD） | ✅ 完成（Step 5 Phase 1 + 014/015 迁移闭环） |
| `backend/` PublishModule（content 审核发布、publish_record、7 条发布权限） | ✅ 完成（Step 6） |
| `backend/` 群众端政务公开 Public Content API（`/api/public/content/*`） | ✅ 完成（Step 7 Phase 1） |
| `backend/` 其余模块 | 待实现 |
| `admin-web/` | 骨架已就绪，已安装依赖，页面待建设 |
| `kiosk-app/` | ✅ 政务公开列表/详情接入 `/api/public/content/*`（Step 8）；办事指南等已迁移 `/api/public/*` |

---

## 10. 常用命令

```bash
# 后端
cd backend
npm run dev          # 开发模式（watch）
npm run build        # 生产构建
npm run type-check   # 仅类型检查

# 群众端
cd kiosk-app
npm run dev          # 开发服务器（端口 5173，/api 代理到 3000）
npm run build        # 生产构建

# 管理端
cd admin-web
npm install          # 首次初始化
npm run dev          # 开发服务器（端口 5174，/api 代理到 3000）
npm run build        # 生产构建
```
