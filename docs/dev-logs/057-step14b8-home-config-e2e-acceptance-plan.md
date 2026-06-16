# 057 · Step 14B-8 首页配置真实链路联调验收准备

**交付日期**：2026-06-16  
**基于**：056-step14b7a-kiosk-home-api-acceptance-closure.md  
**执行方**：Cursor  
**状态**：验收准备完成（待真实环境执行）

---

## 一、执行范围

本步骤仅做 **验收准备与文档修正**，梳理首页配置从管理端编辑 → 审核发布 → Public Home API → 群众端展示的 **真实链路联调验收清单**，供后续在真实 backend + admin-web + kiosk-app 环境中逐项验证。

**未进入 UI 设计阶段**；**未实现** `theme` 视觉应用（待用户补充 UI 要求后再启动）。

**未修改**：backend、admin-web、kiosk-app 源码与测试、database、deploy、端口配置、基线文档。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/055-step14b7-kiosk-public-home-api.md` | 交付日期与 054 对齐；下一步指向本验收清单 |
| `docs/dev-logs/056-step14b7a-kiosk-home-api-acceptance-closure.md` | 交付日期与 055 对齐；修正日期变更说明 |
| `docs/dev-logs/057-step14b8-home-config-e2e-acceptance-plan.md` | 本报告与验收清单 |

---

## 三、是否进入 UI 设计

**否。** 本步骤不涉及 theme 配色、视觉稿或群众端 UI 改版。

---

## 四、是否修改 backend / admin-web / kiosk-app / database / deploy

| 范围 | 是否修改 |
|---|---|
| backend | **否** |
| admin-web | **否** |
| kiosk-app（src / tests） | **否** |
| database / Entity / Migration | **否** |
| deploy | **否** |

---

## 五、日期修正说明

| 文档 | 曾误写 | 现交付日 | 原因 |
|---|---|---|---|
| 055 | `2026-06-12` | **`2026-06-16`** | 不得早于依赖步骤 054（`2026-06-16`） |
| 056 | `2026-06-12` | **`2026-06-16`** | 与 055 同日收口，晚于 054 |
| 057 | `2026-06-12` | **`2026-06-16`** | 本步骤交付日，不得早于 056 |

> 说明：dev-log **序号**表示开发步骤顺序；**交付日期**表示该步骤实际完成日。055→056→057 为连续步骤，均不晚于 054 之后、不写未来日期。端口与远程访问说明见 **058** 文档修正。

---

## 六、开发环境与端口（当前默认）

| 服务 | 启动命令 | 默认端口 | 说明 |
|---|---|---|---|
| backend | `cd backend && npm run dev` | **3100** | `PORT=3100`（见 `backend/.env.example`）；监听 `0.0.0.0` |
| admin-web | `cd admin-web && npm run dev` | **5184** | Vite `host: true`，可局域网访问 |
| kiosk-app | `cd kiosk-app && npm run dev` | **5183** | Vite `host: true`，可局域网访问 |

**API 代理**：admin-web / kiosk-app 的 `/api` 均代理至 **`http://localhost:3100`**（见各 `vite.config.ts`）。

**远程访问示例**（联调机 IP 为 `10.217.19.22` 时）：

| 端 | URL |
|---|---|
| 群众端 | http://10.217.19.22:5183 |
| 管理端 | http://10.217.19.22:5184 |
| 后端（直连，可选） | http://10.217.19.22:3100/api/... |

> 勿将 **5173 / 5174 / 3000 / 8000** 作为当前默认开发端口；上述端口以仓库内 `vite.config.ts` 与 `backend/.env.example` 为准。

---

## 七、首页配置真实链路验收清单

以下清单面向 **真实三联调**（MySQL 开发库 + 三端 dev 服务）。执行人应逐项勾选，全部通过方可认定 14B 首页配置链路验收完成。

### 7.1 启动前置条件

| # | 检查项 | 预期 / 操作 | ☐ |
|---|---|---|---|
| P-1 | 数据库 | MySQL 8 开发库 `touch_kiosk_dev` 可连接；迁移已执行（含 `home_config` / `home_config_version` / `home_module` 及权限 seed） | |
| P-2 | 后端 | `cd backend && npm run dev`，默认 **3100** 端口可访问（如 `http://localhost:3100/api/public/home/config`） | |
| P-3 | 管理端 | `cd admin-web && npm run dev`，默认 **5184** 端口（`host: true`）；`/api` 代理至 `http://localhost:3100` | |
| P-4 | 群众端 | `cd kiosk-app && npm run dev`，默认 **5183** 端口（`host: true`）；`/api` 代理至 `http://localhost:3100` | |
| P-5 | 测试账号 | 至少准备：`SUPER_ADMIN`（全权限）、`CONTENT_EDITOR`（编辑草稿）、`PUBLISH_REVIEWER`（审核发布）各一 | |
| P-6 | 办事指南数据 | `guide_item_config` 中至少有 1 条 `is_visible=1` 且 `is_hot=1` 或 `is_recommend=1` 的事项（供 `homeHotItems` 联调） | |
| P-7 | 浏览器工具 | 管理端用 Chrome；群众端建议 1080×1920 竖屏或 DevTools 设备模拟；远程联调可用 `http://10.217.19.22:5183`（群众端）、`http://10.217.19.22:5184`（管理端） | |
| P-8 | 初始 Public API 状态（可选基线） | 若无已发布配置，`GET /api/public/home/config` 应返回 **HTTP 503** + `code=503`（见 7.5） | |

---

### 7.2 管理端操作步骤

> 路由：`/home/config`（菜单「首页配置」）。`bizId` = 页面展示的 `home_config.id`（UUID）。

#### A. 创建 / 编辑首页配置草稿

| # | 步骤 | 操作 | 预期 | ☐ |
|---|---|---|---|---|
| A-1 | 登录 | 使用 `CONTENT_EDITOR` 或 `SUPER_ADMIN` 登录 admin-web | 进入管理端首页 | |
| A-2 | 进入页面 | 打开「首页配置」 | 显示主表 `status`、`currentVersion`（可空）、`draftVersion` 表单 | |
| A-3 | 填写基础信息 | 设置唯一可识别标题，如 `联调验收大厅-{日期}`；subtitle、topBannerJson（合法 JSON 数组）、themeJson（合法 JSON 对象）、changeRemark | 表单校验通过 | |
| A-4 | 保存草稿 | 点击保存 | 成功提示；`GET /api/admin/home/config` 中 `draftVersion.title` 与填写一致 | |
| A-5 | 权限负例（可选） | 无 `home:config:update` 账号尝试保存 | 403 或按钮不可见 | |

#### B. 新增 / 编辑首页模块

| # | 步骤 | 操作 | 预期 | ☐ |
|---|---|---|---|---|
| B-1 | 新增 route 模块 | 如 `moduleCode=guide_dept`，`moduleName=按部门查`，`targetType=route`，`targetValue=/depts`，`isVisible=true` | 列表出现新模块 | |
| B-2 | 新增 content 模块 | 如 `moduleCode=content_policies`，`moduleName=政策文件`，`targetType=content`，`targetValue=policies`，`isVisible=true` | 列表出现新模块 | |
| B-3 | 编辑模块 | 修改 `moduleName` 为可识别文案（如 `联调-政策文件`） | 保存后列表更新 | |
| B-4 | 排序 | 调整 `sortOrder` 并「保存排序」 | `GET modules` 顺序与 UI 一致 | |
| B-5 | 隐藏模块 | 某模块 `isVisible=false` | 保存成功；发布后 Public API **不应**返回该模块 | |
| B-6 | 删除模块 | 删除一条测试模块（二次确认） | 逻辑删除；draft 列表不再显示 | |

#### C. 提交审核

| # | 步骤 | 操作 | 预期 | ☐ |
|---|---|---|---|---|
| C-1 | 提交 | 点击「提交审核」 | 成功；`draftVersion.status` → `pending`；主表 `status` 符合 api-spec §十 状态机 | |
| C-2 | 编辑锁定 | pending 期间尝试保存草稿或新增模块 | **409** 或 UI 禁用编辑 | |
| C-3 | 发布记录 | 打开「发布记录」 | 出现 `submit` 记录，含 operator、时间、状态流转 | |

#### D. 审核通过或直接发布

**路径 1：标准审核（推荐完整走一遍）**

| # | 步骤 | 操作 | 预期 | ☐ |
|---|---|---|---|---|
| D-1 | 切换审核员 | 使用 `PUBLISH_REVIEWER` 或 `SUPER_ADMIN` 登录 | — | |
| D-2 | 审核通过 | 点击「审核通过」，可选填意见 | 成功；主表 `status=published`；`currentVersionId` 指向新版本 | |
| D-3 | 发布记录 | 查看记录 | 出现 `approve` 记录 | |

**路径 2：直接发布（SUPER_ADMIN / 有 direct-publish 权限）**

| # | 步骤 | 操作 | 预期 | ☐ |
|---|---|---|---|---|
| D-4 | 新建 draft 后 | 点击「直接发布」 | 跳过 pending，直接 `published` | |
| D-5 | 发布记录 | 查看记录 | 出现 `direct-publish` 记录 | |

---

### 7.3 后端接口验证步骤

> 以下可用 curl / Postman / 浏览器 Network；群众端接口 **无需 JWT**。直连 backend 时使用 `http://localhost:3100/api/...`；经前端代理时使用 `http://localhost:5183/api/...` 或 `http://localhost:5184/api/...`。

#### Admin API（需 Bearer Token）

| # | 接口 | 验证点 | ☐ |
|---|---|---|---|
| E-1 | `GET /api/admin/home/config` | 含 `id`、`status`、`draftVersion` / `currentVersion`；**无**审计敏感字段 | |
| E-2 | `GET /api/admin/home/modules` | 仅当前 **draft** 模块；`isVisible` 为 **boolean** | |
| E-3 | `GET /api/admin/publish/home_config/{bizId}/records` | 含 submit / approve（或 direct-publish）；action、fromStatus、toStatus 正确 | |

#### Public Home API

| # | 接口 | 验证点 | ☐ |
|---|---|---|---|
| E-4 | `GET /api/public/home/config`（已发布后） | HTTP **200**；信封 `code=0` | |
| E-5 | 响应字段 | 含 `title`、`subtitle`、`idleSeconds`、`bannerLines`、`theme`、`modules[]`、`homeHotItems[]`、`noticeSummaries[]`、`nav[]` | |
| E-6 | `title` / `subtitle` | 与管理端 **已发布版本** 一致（非 draft） | |
| E-7 | `bannerLines` | 与 `topBannerJson` 映射一致 | |
| E-8 | `modules` | 仅 `is_visible=1` 模块；字段含 `moduleCode`、`moduleName`、`targetType`、`targetValue`；**无** draft/pending 模块 | |
| E-9 | `homeHotItems` | 来自 `guide_item_config` 热/推荐项；项含 `itemId`、`name`；**非** mock 示例数据 | |
| E-10 | `nav` | 固定或由系统参数提供；含首页/返回/重来/帮助类入口 | |
| E-11 | 安全 | 响应 **不含** JWT、权限码、审计字段、共享平台内部参数 | |

---

### 7.4 群众端展示验证步骤

> 本机：`http://localhost:5183/home`；远程联调：`http://10.217.19.22:5183/home`（或 APK）。前端 `/api` 由 Vite 代理至 `http://localhost:3100`。

| # | 步骤 | 验证点 | ☐ |
|---|---|---|---|
| K-1 | 首次加载 | 仅 **1 次** `GET /api/public/home/config` 请求（App + Home 共享 store） | |
| K-2 | 顶部标题区 | 显示远程 `title`、`subtitle`、`bannerLines`（与 E-6、E-7 一致） | |
| K-3 | 高频事项 | 显示 E-9 中配置的 `homeHotItems`；点击跳转 `/items/{itemId}` | |
| K-4 | 模块按钮 | 显示 E-8 可见模块；名称与排序正确 | |
| K-5 | route 模块 | 点击「按部门查」等 → 进入 `/depts` | |
| K-6 | content 模块 | 点击「政策文件」等 → 进入 `/content/policies` | |
| K-7 | 通知摘要 | 若后端有已发布 notices，`noticeSummaries` 展示；点击进详情路由 | |
| K-8 | 底部导航 | 与 `nav` 一致；首页/返回/重来/帮助可点击 | |
| K-9 | 90 秒 idle | 无操作约 90 秒后回首页并清理临时 session（guide/content store） | |
| K-10 | 零键盘 | 首页无 `<input>` / `<textarea>` / `contenteditable`；不唤起系统键盘 | |
| K-11 | 接口安全 | Network 中 **无** `/api/admin/*` 请求；**无** 大数据共享平台直连 | |
| K-12 | theme | API 返回的 `theme` 可被接收；**不要求** UI 配色变化（UI 设计未启动） | |

---

### 7.5 503 离线兜底验证步骤

| # | 场景 | 操作 | 预期 | ☐ |
|---|---|---|---|---|
| F-1 | 无已发布配置 | 确保主表无有效 `published` + `current_version_id`（初始环境或执行 **撤回** 后） | `GET /api/public/home/config` → HTTP **503**，`code=503`，`data=null` | |
| F-2 | 群众端展示 | 刷新 kiosk-app 首页 | 显示 **离线兜底** 标题「政务服务触摸查询」；**不白屏** | |
| F-3 | 离线模块 | 检查首页模块区 | 含「按部门查」「按主题查」及 9 个政务公开入口 | |
| F-4 | 离线高频事项 | 检查首页 | **不展示** 示例/虚构高频事项（`homeHotItems` 为空） | |
| F-5 | 网络失败 | 停止 backend 或断网模拟 | 群众端仍展示离线配置，无「数据加载失败」阻断页 | |
| F-6 | 恢复发布 | 重新审核发布后刷新 | 切回远程配置（K-2～K-4 再次验证） | |

---

### 7.6 权限与发布记录检查点

| # | 检查点 | 预期 | ☐ |
|---|---|---|---|
| R-1 | `home:config:read` | 无权限用户不可访问 `/home/config` 路由或菜单 | |
| R-2 | `home:config:update` | 无权限不可保存草稿 | |
| R-3 | `home:module:*` | 模块 CRUD / 排序按权限码控制 | |
| R-4 | `publish:submit` | 仅授权角色可提交审核 | |
| R-5 | `publish:approve` / `publish:reject` | 仅审核员可操作 | |
| R-6 | `publish:direct-publish` | 仅高权限角色可直接发布 | |
| R-7 | `publish:record:read` | 发布记录对话框只读；含 submit / approve / reject / withdraw 等 | |
| R-8 | `publish_record` 表 | 每次 submit / approve / direct-publish / withdraw 均有记录（可查 DB 或 Admin API） | |
| R-9 | 驳回流程（可选） | reject 后 draft 可再编辑并重新 submit | |
| R-10 | 撤回流程（可选） | withdraw 后 Public API 503；群众端回离线；再发布恢复 | |

---

### 7.7 不通过时需要记录的信息

任一项失败，验收人应记录以下信息，便于排障与回归：

| 字段 | 说明 |
|---|---|
| 清单编号 | 如 `E-8`、`K-3`、`F-2` |
| 执行时间 | ISO 8601 或本地时间 |
| 执行人 / 角色 | 使用的 admin 账号角色 |
| 环境 | backend / admin-web / kiosk-app 版本（git commit 或 tag） |
| 前置状态 | `home_config.status`、`currentVersionId`、是否存在 draft/pending |
| 请求 | 方法、URL、请求体摘要（Admin）；Public API 无需 Token |
| 响应 | HTTP 状态码、信封 `code` / `message`、关键 `data` 字段 |
| 群众端表现 | 截图或录屏；Network 面板 home/config 次数与状态 |
| 数据库快照（可选） | `home_config`、`home_config_version`、`home_module`、`publish_record` 相关行 id |
| 预期 vs 实际 | 简要对比 |
| 严重程度 | 阻塞 / 一般 / 建议 |
| 关联 Step | 如 14B-5 Public API、14B-6 管理端页面、14B-7 群众端 |

---

### 7.8 建议验收顺序（一次性走通）

```text
1. P-* 前置条件
2. F-1～F-4（可选：先确认 503 基线）
3. A-* → B-* → C-* → D-*（管理端完整发布）
4. E-*（Public / Admin API 核对）
5. K-*（群众端远程展示）
6. R-*（权限与发布记录）
7. F-5～F-6 或 R-10（撤回 / 恢复，验证 503 兜底切换）
```

---

## 八、验证命令和结果

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |

> 本步骤无代码变更，不执行构建与单测。

---

## 九、下一步建议

| 项 | 说明 |
|---|---|
| **执行本清单** | 由用户或 Codex 在真实环境按 §7 逐项联调并勾选 |
| **记录联调结果** | 建议新增 `059-step14b8b-home-config-e2e-acceptance-result.md` 记录通过/失败项 |
| **theme / UI** | **暂缓**，待用户补充 UI 设计要求后再单独立项；本步骤未进入 UI 设计 |
| **ContentModule** | notices 等 content 类型若 Public API 无数据，K-7 可标记 N/A |
| **HighGo 预检** | 生产迁移前可在 HighGo 环境重复 E-4～E-11 接口验证 |
| **文档** | 端口与日期细节见 `058-step14b8a-e2e-plan-doc-fix.md` |

---

**结论**：14B-8 完成验收准备。055/056/057 交付日期与端口说明已与仓库配置对齐（058 收口），真实链路联调验收清单已就绪，待真实环境执行。
