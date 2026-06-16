# 061 · Step 14B-8d 首页配置真实链路联调复测摘要

**交付日期**：2026-06-16  
**基于**：059-step14b8b-home-config-e2e-acceptance-result.md、060-step14b8c-home-config-e2e-execution-summary.md  
**执行方**：Cursor  
**状态**：已执行，**未通过**（基础设施就绪，主链路仍阻塞）

---

## 一、执行范围

在 8c 阻塞项（迁移、503 基线）由用户/Codex 处理后，按 057 清单 **复测** 真实 backend + admin-web + kiosk-app 环境，并更新 059。

**未修改** backend、admin-web、kiosk-app 源码与测试；**未执行**迁移或手写 SQL；**未操作** `oms_db`；**未进入 UI 设计**。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/059-step14b8b-home-config-e2e-acceptance-result.md` | 回填 14B-8d 复测结果 |
| `docs/dev-logs/061-step14b8d-home-config-e2e-retest-summary.md` | 本摘要 |

---

## 三、是否进入 UI 设计

**否。** theme / UI 视觉应用仍暂缓。

---

## 四、是否修改 backend / admin-web / kiosk-app / database / deploy

| 范围 | 是否修改 |
|---|---|
| backend | **否** |
| admin-web | **否** |
| kiosk-app | **否** |
| database / Entity / Migration | **否** |
| deploy / 端口配置 | **否** |

---

## 五、相对 8c 的变化

| 项 | 8c 结果 | 8d 复测结果 |
|---|---|---|
| home/guide 迁移 | 失败（表缺失） | **通过**（含 `CreateHomeConfigTables` 等 10+ 迁移） |
| 无发布 Public API | HTTP **500** | HTTP **503**，`code=503`，`data=null` ✅ |
| `guide_item_config` 热项 | 失败 | **通过**（`i-001` / 社保查询（联调）） |
| RBAC 联调账号 | 未确认 | DB 存在 `super_admin` / `content_editor` / `publish_reviewer` |
| 管理端发布链路 A～D | 未执行 | **仍未执行**（无法完成登录/API 写操作） |
| Public API 200 + 群众端远程展示 | 未执行 | **仍未执行**（`home_config` 仍 0 条） |

---

## 六、复测是否通过

| 项 | 结论 |
|---|---|
| 三端服务 3100 / 5183 / 5184 | **通过** |
| 503 基线（P-8 / F-1） | **通过** |
| 迁移与热项前置（P-1 / P-6） | **通过** |
| 管理端草稿→发布（A～D） | **未执行** |
| Public Home API 200（E-4～E-11） | **未执行**（仍为 503） |
| 群众端远程展示（K） | **未执行** |
| 503 离线兜底浏览器实测（F-2～F-4） | **未执行** |
| 权限与发布记录（R） | **未执行** |
| **整体** | **不通过** |

---

## 七、失败 / 阻塞项

| # | 编号 | 说明 | 严重程度 |
|---|---|---|---|
| B-1 | P-5 | 三类 RBAC 用户已在 DB，但 Agent 运行环境 **无** `E2E_*` 密码变量；`POST /api/admin/auth/login` 对探测请求返回 **401**；仓库 dev-log **未记录**联调密码（符合 review-rules） | **阻塞** |
| B-2 | A～D / E / K / R | 因 B-1，`home_config` 仍为 **0 条**，无法验证发布→Public 200→群众端远程展示主链路 | **阻塞** |

**说明**：8c 的 **B-1 迁移阻塞已解除**；当前主阻塞转为 **联调凭据未进入 Agent 可安全使用的渠道**（非迁移问题）。

---

## 八、证据摘要

| 编号 | 请求 / 探测 | 结果 |
|---|---|---|
| H-1 | `GET http://localhost:3100/api/public/home/config` | HTTP **503**；`code=503`；`message=首页配置暂不可用，请稍后再试`；`data=null` |
| H-2 | `GET http://localhost:5183/api/public/home/config`（Vite 代理） | HTTP **503**；`code=503`（与 H-1 一致） |
| H-3 | `GET http://localhost:3100/api/admin/home/config`（无 Token） | HTTP **401**；`code=401` |
| H-4 | DB 只读：`home_config` / `publish_record` | `home_config` **0 条**；`home_config` 类型 `publish_record` **0 条** |
| H-5 | DB 只读：迁移 / 用户 / 热项 | 最新迁移含 `SeedHomeConfigRolePermissions*`；用户 3 个；热项 `platform_item_id=i-001` |
| H-6 | 三端 HTTP | `localhost` 与 `10.217.19.22` 的 **5183 / 5184** 均 **200** |
| H-7 | 登录探测 | `POST /api/admin/auth/login`（无有效密码）→ **401**（不记录密码） |

---

## 九、下一步建议

1. **提供联调凭据渠道**：将三类账号密码写入 Agent 可读的 `E2E_*` 环境变量，或在不落库文档的前提下由验收人手工完成 A～D 后仅复测 E/K。
2. **完整走 057 §7.8**：凭据就绪后按 A→B→C→D→E→K→F→R 顺序执行；发布后确认 Public API **200** 与群众端远程 title/modules/homeHotItems。
3. **补浏览器证据**：F-2～F-4、K-1～K-11 需 DevTools Network 截图（503 离线兜底、无 `/api/admin/*`、无共享平台直连）。
4. **UI / theme**：仍暂缓。

---

## 十、git diff --check 结果

| 命令 | 结果 |
|---|---|
| `git diff --check` | **通过** |

---

**结论**：14B-8d 确认 **迁移与 503 基线已就绪**（相对 8c 显著改善），但因 **联调登录凭据未对 Agent 可用**，主链路仍未走通，复测结论为 **不通过**。
