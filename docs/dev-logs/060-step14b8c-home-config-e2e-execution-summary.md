# 060 · Step 14B-8c 首页配置真实链路联调执行摘要

**交付日期**：2026-06-16  
**基于**：059-step14b8b-home-config-e2e-acceptance-result.md  
**执行方**：Cursor  
**状态**：已执行，**未通过**

---

## 一、执行范围

按 057 验收清单对真实 backend + admin-web + kiosk-app 环境进行联调探测，并将结果回填至 059。**未修改任何源码**；**未执行数据库迁移或手写 SQL**；**未进入 UI 设计**。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/059-step14b8b-home-config-e2e-acceptance-result.md` | 回填联调环境、P/E/F 等项结果、失败项、证据、最终结论 |
| `docs/dev-logs/060-step14b8c-home-config-e2e-execution-summary.md` | 本摘要 |

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

## 五、联调是否完成

| 项 | 结论 |
|---|---|
| 三端服务 | **已确认**运行：backend **3100**、kiosk **5183**、admin **5184** |
| 远程访问 | `http://10.217.19.22:5183`、`5184` HTTP 200 |
| 管理端发布链路（A～D） | **未执行** — 无测试账号 |
| Public Home API 200 路径（E-4～E-11） | **未执行** — API 返回 500 |
| 群众端远程展示（K） | **未执行** — 无已发布配置 |
| 503 兜底（F-1） | **失败** — 实际 500 非 503 |
| 权限与发布记录（R） | **未执行** |
| **整体** | **不通过** |

---

## 六、阻塞项

| # | 阻塞项 | 说明 | 处理方式 |
|---|---|---|---|
| B-1 | 数据库迁移未就绪 | `guide_item_config`、`guide_dept_mapping` 等表不存在；Public API **500** | 由用户/Codex 在 `touch_kiosk_dev` 执行 backend 迁移（见 059 §十三） |
| B-2 | 联调测试账号缺失 | 仓库 dev-log 无可用 SUPER_ADMIN / EDITOR / REVIEWER 凭据 | 用户提供或写入联调手册后再测 A～D、R |
| B-3 | Public API 语义偏差 | 无发布配置时预期 **503**，当前 **500**（疑为表缺失导致未捕获异常） | 迁移就绪后复测 P-8 / F-1 |

---

## 七、未执行项（环境就绪后补测）

- A-1～A-5、B-1～B-6、C-1～C-3、D-1～D-5（管理端全流程）
- E-1～E-3（需 JWT）、E-5～E-11（需成功发布）
- K-1～K-11 浏览器 Network / 跳转 / idle（需远程配置或离线浏览器截图）
- F-2～F-6、R-1～R-10

---

## 八、git diff --check 结果

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |

---

## 九、下一步建议

1. **用户/Codex**：在 `touch_kiosk_dev` 执行 home + guide 相关迁移与权限 seed。
2. **用户/Codex**：提供三类 RBAC 联调账号凭据（或确认 seed 默认账号）。
3. **复测**：迁移与账号就绪后，按 057 §7.8 顺序重新执行，**更新 059** 同一文档（不必新建编号）。
4. **503 验证**：无发布配置时确认 Public API 返回 HTTP 503；群众端离线兜底（F-2～F-4）补浏览器截图。
5. **UI / theme**：等待用户补充 UI 要求后再单独立项。

---

**结论**：14B-8c 已完成可自动化部分的联调探测与文档回填；主链路因 **数据库迁移** 与 **测试账号** 阻塞未能走通，最终结论为 **不通过**。
