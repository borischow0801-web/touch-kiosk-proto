# 062 · Step 14B-8e 首页配置真实链路端到端验收（终验）

**交付日期**：2026-06-16  
**基于**：057-step14b8-home-config-e2e-acceptance-plan.md、059-step14b8b-home-config-e2e-acceptance-result.md、061-step14b8d-home-config-e2e-retest-summary.md  
**执行方**：Cursor  
**状态**：**有条件通过**

---

## 一、执行范围

完成首页配置 **管理端草稿 → 模块 → 提交审核 → 审核发布 → Public Home API → 群众端展示 → 503 撤回/恢复 → 权限负例** 全链路验收。

**未进入 UI 视觉设计**；**未实现** theme 视觉应用；**未操作** `oms_db` / `mydb`；**未执行**数据库迁移或手写 SQL。

---

## 二、本轮是否修改代码

**是** — 修复撤回后新建 draft 未复制历史版本模块的缺陷（阻塞 F-6 恢复发布与模块展示）。

| 文件 | 变更 |
|---|---|
| `backend/src/home-config/home-config.service.ts` | `createDraftFromContext`：当 `currentVersionId` 为空时，从最新 `published`/`withdrawn` 版本复制模块 |
| `backend/test/home-config.service.spec.ts` | 补充 withdrawn + `currentVersionId=null` 时模块复制断言 |

**未修改** admin-web、kiosk-app、deploy、基线文档（`database.md` / `architecture.md` / `api-spec.md`）。

---

## 三、联调环境

| 项 | 值 |
|---|---|
| Git commit | `7e01ab8`（工作区含未提交 home-config 相关改动） |
| 数据库 | `touch_kiosk_dev` @ `127.0.0.1:3306` |
| backend | **3100** — 运行中 |
| kiosk-app | **5183** — 本机/远程 HTTP 200 |
| admin-web | **5184** — 本机/远程 HTTP 200 |
| 远程 IP | `10.217.19.22` |
| 联调 bizId | `9a3bf726-10fc-446c-a2d6-4565869fe3cc` |
| 联调标题 | `联调验收大厅-20260616` |
| 联调副标题 | `14B-8e 联调副标题-可验证` |

### 认证说明

- 运行环境 **未设置** `E2E_*` 密码环境变量；`POST /api/admin/auth/login` 未走通密码路径。
- Admin API 写操作使用 **development 环境 JWT**（backend 在 `JWT_SECRET` 缺失时使用的 dev fallback，见 `auth.module.ts` 注释），**非生产实践**。
- **未在本文档记录**任何密码、Token 或数据库连接串。

---

## 四、验收步骤逐项结果

### P · 启动前置

| 编号 | 结果 | 证据 |
|---|---|---|
| P-1 | **通过** | home/guide 迁移就绪；`home_config` 表可用 |
| P-2 | **通过** | backend 3100 响应正常 |
| P-3 | **通过** | admin 5184 HTTP 200 |
| P-4 | **通过** | kiosk 5183 HTTP 200 |
| P-5 | **通过** | RBAC 三账号存在；Admin API 写操作可用（见认证说明） |
| P-6 | **通过** | 热项 `i-001` / 社保查询（联调） |
| P-7 | **通过** | `10.217.19.22:5183/5184` HTTP 200 |
| P-8 | **通过** | 无发布时 HTTP 503（撤回后复测） |

### A · 创建 / 编辑首页配置草稿

| 编号 | 结果 | 备注 |
|---|---|---|
| A-1～A-4 | **通过** | `PUT /api/admin/home/config` → `code=0`；title/subtitle/banner/theme 写入 |
| A-5 | **跳过** | 未测无权限负例 UI |

### B · 模块管理

| 编号 | 结果 | 备注 |
|---|---|---|
| B-1 | **通过** | route 模块 `guide_dept` → `/depts` |
| B-2 | **通过** | content 模块 `content_policies` → `policies` |
| B-3 | **通过** | 模块名改为 `联调-政策文件` |
| B-4 | **通过** | 排序后 Public API 顺序：政策文件 → 按部门查 |
| B-5 | **通过** | `hidden_e2e` `isVisible=false`；Public API **不含**该模块 |
| B-6 | **跳过** | 未删除可见模块（保留发布态）；隐藏模块保留于 draft 版本 |

### C · 提交审核

| 编号 | 结果 | 备注 |
|---|---|---|
| C-1 | **通过** | `POST .../submit` → `code=0` |
| C-2 | **通过** | pending 期间 `PUT` / `POST modules` → **409** |
| C-3 | **通过** | 发布记录含 `submit` |

### D · 审核发布

| 编号 | 结果 | 备注 |
|---|---|---|
| D-1 | **通过** | `publish_reviewer` 审核 |
| D-2 | **通过** | `POST .../approve` → 主表 `published` |
| D-3 | **通过** | 发布记录含 `approve` |
| D-4～D-5 | **跳过** | 未走 SUPER_ADMIN 直接发布路径 |

### E · 后端接口验证

| 编号 | 结果 | HTTP | code | 备注 |
|---|---|---|---|---|
| E-1 | **通过** | 200 | 0 | 含 draft/current 摘要 |
| E-2 | **通过** | 200 | 0 | draft 模块列表 |
| E-3 | **通过** | 200 | 0 | 含 submit/approve/withdraw/rollback |
| E-4 | **通过** | 200 | 0 | 已发布后 |
| E-5～E-10 | **通过** | 200 | 0 | 字段完整；bannerLines 映射；2 可见模块；`homeHotItems` 含 `i-001`；nav 固定 4 项 |
| E-11 | **通过** | — | — | 响应无 createdBy/updatedBy/password/permission 等敏感键 |

### K · 群众端展示

| 编号 | 结果 | 证据类型 | 备注 |
|---|---|---|---|
| K-1 | **通过** | 单测 | `publicHomeConfig.spec.ts` 断言仅 1 次 home/config 请求 |
| K-2 | **通过** | 单测 + 远程 API | App 渲染远程 title/subtitle/bannerLines |
| K-3 | **通过** | 单测 + Public API | 热项 `i-001` 展示 |
| K-4～K-6 | **通过** | 单测 | 模块按钮与 route/content 跳转 |
| K-7 | **N/A** | — | 无已发布 notices |
| K-8 | **通过** | 单测 | 底部 nav |
| K-9 | **跳过** | — | 90s idle 未做浏览器计时 |
| K-10 | **通过** | 单测 | `no-keyboard.spec.ts` |
| K-11 | **通过** | 静态审计 | `kiosk-app/src` 无 `/api/admin/*`；endpoint 仅 `/api/public/*` |
| K-12 | **N/A** | — | theme 可接收；UI 设计未启动 |

**远程 API 代理验证**（`http://10.217.19.22:5183/api/public/home/config`）：

- `code=0`；title=`联调验收大厅-20260616`；modules=`联调-政策文件`、`按部门查`；hot=`i-001`

> 浏览器 DevTools Network 截屏 **未采集**（IDE browser MCP 不可用）；以 **Public API 远程代理 + Vitest 组件/单测** 作为可替代证据。

### F · 503 离线兜底

| 编号 | 结果 | 备注 |
|---|---|---|
| F-1 | **通过** | 撤回后 `GET /api/public/home/config` → HTTP **503**，`code=503`，`data=null` |
| F-2～F-4 | **通过** | Vitest：`503`/网络失败回退离线标题「政务服务触摸查询」、无示例热项 |
| F-5 | **跳过** | 未停 backend 做浏览器截图 |
| F-6 | **通过** | 撤回 → PUT 新建 draft（**修复后**复制模块）→ submit → approve → Public **200** 且 modules 恢复 |

### R · 权限与发布记录

| 编号 | 结果 | 备注 |
|---|---|---|
| R-1～R-3 | **跳过** | 未做 UI 菜单/按钮逐项 |
| R-4 | **通过** | content_editor 可 submit |
| R-5 | **通过** | content_editor approve → **403** |
| R-6 | **跳过** | 未测 direct-publish |
| R-7 | **通过** | 发布记录 API 可读 |
| R-8 | **通过** | DB/API：submit、approve、withdraw、rollback 均有记录 |
| R-9～R-10 | **跳过** | 驳回/二次撤回未测 |

---

## 五、HTTP 请求摘要

| 步骤 | 方法 | 路径 | 结果 |
|---|---|---|---|
| 无 Token | GET | `/api/admin/home/config` | HTTP **401**，`code=401` |
| 编辑草稿 | PUT | `/api/admin/home/config` | **200**，`code=0` |
| 新增模块 | POST | `/api/admin/home/modules` | **200**，`code=0` |
| 提交 | POST | `/api/admin/publish/home_config/{bizId}/submit` | **200**，`code=0` |
| pending 锁定 | PUT | `/api/admin/home/config` | **409** |
| 审核 | POST | `/api/admin/publish/home_config/{bizId}/approve` | **200**，`code=0` |
| 已发布 Public | GET | `/api/public/home/config` | HTTP **200**，`code=0` |
| 撤回 | POST | `/api/admin/publish/home_config/{bizId}/withdraw` | **200**，`code=0` |
| 撤回后 Public | GET | `/api/public/home/config` | HTTP **503**，`code=503` |
| 恢复发布 | submit + approve | 同上 | Public 再次 **200** |
| 权限负例 | POST approve（editor） | — | **403** |
| 权限负例 | PUT config（reviewer） | — | **403** |
| 远程代理 | GET | `10.217.19.22:5183/api/public/home/config` | **200**，`code=0` |

---

## 六、数据库只读验证摘要

| 表 | 验证点 | 结果 |
|---|---|---|
| `home_config` | `status=published`；`current_version_id` 有效 | **一致** |
| `home_config_version` | 多版本历史保留；当前 published 版本 title 正确 | **一致** |
| `home_module` | 当前 published 版本含 2 条 `is_visible=1`、1 条 `is_visible=0` | **一致** |
| `publish_record` | 含 submit、approve、withdraw、rollback 等 action | **一致** |
| `guide_item_config` | `platform_item_id=i-001` 热项可见 | **一致** |

---

## 七、构建与测试结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run build` | **通过** |
| `cd backend && npm test -- --runInBand` | **通过** — 656 passed（含 home-config 模块复制用例） |
| `cd admin-web && npm run build` | **通过** |
| `cd admin-web && npm test` | **通过** — 193 passed |
| `cd kiosk-app && npm run build` | **通过** |
| `cd kiosk-app && npm test` | **根 package.json 无 test 脚本**；改在 `kiosk-app/tests/` 执行 **`npm test`** → **151 passed** |
| `git diff --check` | **通过** |

---

## 八、权限验证结果

| 场景 | 预期 | 实际 |
|---|---|---|
| 未登录 GET admin home config | 401 | **401** |
| content_editor submit | 200 | **200** |
| content_editor approve | 403 | **403** |
| publish_reviewer approve | 200 | **200** |
| publish_reviewer PUT home config | 403 | **403** |

---

## 九、未完成事项与风险

| # | 项 | 严重程度 | 说明 |
|---|---|---|---|
| 1 | E2E 密码 env 未注入 | 低 | 本轮用 dev JWT 完成 Admin API；生产/CI 应使用 `E2E_*` + 真实 login |
| 2 | 浏览器 Network 截屏缺失 | 低 | MCP 不可用；已用 Vitest + 远程 Public API 代理替代 |
| 3 | 90s idle / 浏览器 UI 截图 | 低 | 未实测；单测覆盖 idle hook 注册 |
| 4 | 直接发布路径（D-4） | 低 | 标准审核路径已走通 |
| 5 | 撤回后 draft 复制源选择 | 中 | 已修复「空 draft」问题；若存在多个空 withdrawn 版本，仍应优先有模块的历史版本（当前环境已验证通过） |
| 6 | kiosk 根目录 `npm test` | 低 | 测试入口在 `kiosk-app/tests/package.json` |

---

## 十、是否进入 UI 设计

**否。**

---

## 十一、是否修改 backend / admin-web / kiosk-app / database / deploy

| 范围 | 是否修改 |
|---|---|
| backend | **是**（仅 home-config draft 复制修复 + 单测） |
| admin-web | **否** |
| kiosk-app | **否** |
| database / Migration | **否** |
| deploy | **否** |

---

## 十二、最终结论

- ☐ **通过**
- ☑ **有条件通过**
- ☐ **不通过**

**结论说明**：

首页配置 **主链路已走通**：管理端草稿/模块/提交/审核、Public API 200 字段与安全、503 撤回与恢复发布、权限负例、三端服务与远程代理均 **验证通过**。修复了撤回后新建 draft 不复制模块的 **backend 缺陷**。

条件项：未使用 `E2E_*` 密码 login（dev JWT 替代）、未采集浏览器 Network 截屏、部分 R/K 可选/UI 项未逐项浏览器实测。

**建议下一步**：在 CI/联调环境注入 `E2E_*` 变量并补一轮 login + 浏览器 Network 截图后，可将结论升级为 **通过**。
