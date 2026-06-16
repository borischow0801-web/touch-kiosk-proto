# 064 · Step 14B-8g 真实 Login 验收或延期 · 首页配置阶段收尾

**交付日期**：2026-06-16  
**基于**：062-step14b8e-home-config-e2e-final.md、063-step14b8f-home-config-e2e-closure.md、docs/review-rules.md  
**执行方**：Cursor  
**文档类型**：Step 14B 阶段收尾判断（**仅文档，无代码变更**）

---

## 一、执行范围

按 `review-rules.md` 对 **Step 14B 首页配置阶段** 做收尾判断；本轮 **仅补真实 login 验收或记录延期**，不继续修改首页配置代码。

**未进入 UI 视觉设计**；**未实现**二期功能；**未操作** `oms_db` / `mydb`；**未修改** backend / admin-web / kiosk-app 源码及 database / architecture / api-spec 基线文档。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/064-step14b8g-login-acceptance-or-defer.md` | 本报告（唯一交付物） |

---

## 三、E2E 环境变量探测

| 变量 | 探测结果 |
|---|---|
| `E2E_CONTENT_EDITOR_PASSWORD` | **未设置** |
| `E2E_PUBLISH_REVIEWER_PASSWORD` | **未设置** |
| `E2E_SUPER_ADMIN_PASSWORD` | **未设置** |

探测方式：运行环境 shell 检查变量是否存在（**未读取、未输出**变量值）。

---

## 四、真实 Login 验收执行情况

**未执行。**

按任务约束：

- **未**调用 `POST /api/admin/auth/login`
- **未**使用 development JWT 或任何伪造 Token 替代真实登录
- **未**记录密码、Token 或数据库连接串

### 4.1 原计划六步（延期）

| # | 场景 | 状态 |
|---|---|---|
| 1 | `content_editor` → `POST /api/admin/auth/login` | **延期** |
| 2 | 真实 Token → submit 可成功 | **延期** |
| 3 | 真实 Token → approve 返回 **403** | **延期** |
| 4 | `publish_reviewer` → `POST /api/admin/auth/login` | **延期** |
| 5 | 真实 Token → approve 可成功 | **延期** |
| 6 | 真实 Token → `PUT /api/admin/home/config` 返回 **403** | **延期** |

**延期原因**：运行环境未注入 `E2E_CONTENT_EDITOR_PASSWORD`、`E2E_PUBLISH_REVIEWER_PASSWORD`、`E2E_SUPER_ADMIN_PASSWORD`。

---

## 五、Step 14B 阶段交付回顾（据 062 / 063）

| 维度 | 状态 | 依据 |
|---|---|---|
| 数据模型与迁移 | ✅ | `home_config` / `home_config_version` / `home_module` + 权限 seed |
| Admin CRUD / 发布适配 | ✅ | 管理端首页配置页 + Publish 路由 |
| Public Home API | ✅ | 062：已发布 200、503 撤回、字段与安全边界 |
| kiosk 对接 Public API | ✅ | 062：远程代理 + Vitest；503 离线兜底 |
| E2E 主链路（非 login） | ✅ 有条件 | 062 dev JWT 路径走通；063 边界修复 + 659 单测 |
| 撤回后 draft 模块复制 | ✅ | 063：`findLatestCopySourceVersion` 模块优先 + 3 项单测 |
| **真实 login + RBAC HTTP** | ⏸ **延期** | 本步 E2E_* 未注入 |

---

## 六、review-rules 收口判断

### 6.1 可验收项（现阶段）

依据 062 / 063 与 review-rules 必查项，以下 **可认定验收**：

- 架构：HomeConfig 归属 backend，Admin `/api/admin/*`、Public `/api/public/*` 分离
- 数据库：UUID 主键、varchar 状态、text JSON、逻辑删除（与 `database.md` 一致）
- API：统一响应、发布记录、Public 不暴露审计/凭据字段
- 群众端：优先 Public Home API，503/失败离线兜底，不调 admin
- backend 边界修复：撤回后恢复发布模块复制逻辑 + 单测

### 6.2 保留条件项

| 条件项 | 说明 |
|---|---|
| 真实 login 四场景 | 须 `E2E_*` 注入后 `POST /api/admin/auth/login` 复测 |
| 062 中 dev JWT 路径 | 不能替代生产/CI 的密码登录验收 |
| 浏览器 Network 截屏 | 062 已用单测 + 远程 API 替代；可选补采 |

**明确结论**：

- **Step 14B 首页配置代码与 backend 边界修复：可验收。**
- **Step 14B 整体验收：仍保留真实 login 条件项，本步结论为有条件通过。**

---

## 七、延期验收补测清单（环境就绪后）

注入以下变量（**不得写入仓库文档**）：

- `E2E_CONTENT_EDITOR_PASSWORD`
- `E2E_PUBLISH_REVIEWER_PASSWORD`
- `E2E_SUPER_ADMIN_PASSWORD`（若需 SUPER_ADMIN 场景）

补测步骤（与 8g 任务一致）：

1. `POST /api/admin/auth/login`（`content_editor`）→ 记录 HTTP 状态码与信封 `code`（**不记录 Token**）
2. 真实 Token → submit → 预期 **200**，`code=0`
3. 真实 Token → approve → 预期 **403**
4. `POST /api/admin/auth/login`（`publish_reviewer`）
5. 真实 Token → approve → 预期 **200**，`code=0`
6. 真实 Token → `PUT /api/admin/home/config` → 预期 **403**

补测通过后，可将 Step 14B 整体验收升级为 **通过**（建议更新本文件或新增 dev-log 编号，仍不记录凭据）。

---

## 八、下一阶段提示（UI 视觉设计）

**若准备进入群众端 UI 视觉设计（theme 配色、视觉稿等）：必须先暂停，等待用户补充 UI 要求后再单独立项。**

本阶段 **未启动** theme 视觉应用；062 / 063 已明确暂缓。

---

## 九、git diff --check

| 命令 | 结果 |
|---|---|
| `git diff --check` | **通过** |

---

## 十、是否修改代码 / 基线 / 二期 / UI

| 项 | 结果 |
|---|---|
| backend / admin-web / kiosk-app 源码 | **否** |
| database.md / architecture.md / api-spec.md | **否** |
| UI 视觉设计 | **否** |
| 二期功能 | **否** |
| oms_db / mydb | **未操作** |

---

## 十一、最终结论

- ☐ **通过** — 真实 login 四场景全部通过（**未满足**：E2E_* 未注入，未执行 login）
- ☑ **有条件通过** — E2E_* 未注入，真实 login **延期**；14B 代码与边界修复可验收，整体验收保留 login 条件项
- ☐ **不通过** — 不适用（未执行 login，无失败场景）

**收口说明**：

Step 14B 首页配置阶段在 **功能实现、Public 链路、E2E 主路径（非密码登录）、063 边界修复** 方面已达到可交付标准；**真实 login RBAC HTTP 验收** 因环境未提供 `E2E_*` 凭据而 **延期**，不构成代码缺陷，但构成 **整体验收条件项**。待凭据注入后执行 §七 补测即可收口为 **通过**。
