# 058 · Step 14B-8a 验收清单文档修正

**交付日期**：2026-06-16  
**基于**：057-step14b8-home-config-e2e-acceptance-plan.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

仅修正 dev-log **交付日期**与 **057 验收清单端口/远程访问** 描述，使其与仓库当前配置一致。不修改任何源码、数据库、deploy 或端口配置。

**未进入 UI 设计阶段**；**theme / UI 视觉应用暂缓**，等待用户补充 UI 要求后再启动。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/055-step14b7-kiosk-public-home-api.md` | 交付日期 `2026-06-12` → **`2026-06-16`** |
| `docs/dev-logs/056-step14b7a-kiosk-home-api-acceptance-closure.md` | 交付日期对齐；更新 §八 日期修正说明 |
| `docs/dev-logs/057-step14b8-home-config-e2e-acceptance-plan.md` | 日期、端口、远程访问、章节编号修正 |
| `docs/dev-logs/058-step14b8a-e2e-plan-doc-fix.md` | 本报告 |

---

## 三、日期修正说明

| 文档 | 修正前 | 修正后 | 说明 |
|---|---|---|---|
| 055 | `2026-06-12` | **`2026-06-16`** | 不得早于依赖步骤 054（`2026-06-16`） |
| 056 | `2026-06-12` | **`2026-06-16`** | 基于 055，与 054 之后步骤自洽 |
| 057 | `2026-06-12` | **`2026-06-16`** | 最新验收准备步骤，不早于 056 |
| 058 | — | **`2026-06-16`** | 本步骤文档收口日 |

**自洽规则**：dev-log 序号表示步骤顺序（055→056→057→058）；交付日期均 **≥ 054**，且 **不写未来日期**。

---

## 四、端口修正说明

依据 `backend/.env.example`、`backend/src/main.ts`、`kiosk-app/vite.config.ts`、`admin-web/vite.config.ts`：

| 服务 | 错误写法（已移除） | 当前默认 |
|---|---|---|
| backend | 3000 / 8000 | **3100**（`PORT=3100`，监听 `0.0.0.0`） |
| admin-web | 5174 | **5184**（`host: true`，`strictPort: true`） |
| kiosk-app | 5173 | **5183**（`host: true`，`strictPort: true`） |

**API 代理**：admin-web / kiosk-app 的 `/api` → **`http://localhost:3100`**。

**远程访问示例**（057 §六 已写入）：

- 群众端：http://10.217.19.22:5183
- 管理端：http://10.217.19.22:5184
- 后端直连（可选）：http://10.217.19.22:3100/api/...

---

## 五、是否进入 UI 设计

**否。** 本次仅文档修正；theme 视觉应用仍暂缓。

---

## 六、是否修改 backend / admin-web / kiosk-app / database / deploy

| 范围 | 是否修改 |
|---|---|
| backend | **否** |
| admin-web | **否** |
| kiosk-app | **否** |
| database / Entity / Migration | **否** |
| deploy | **否** |
| 端口配置（vite / .env） | **否** |

---

## 七、git diff --check 结果

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |

---

## 八、下一步建议

| 项 | 说明 |
|---|---|
| **执行 057 清单** | 按 §7 在真实环境联调（使用 5183 / 5184 / 3100 端口） |
| **记录联调结果** | 建议新增 `059-step14b8b-home-config-e2e-acceptance-result.md` |
| **UI / theme** | 待用户补充 UI 要求后单独立项 |
| **CLAUDE.md 常用命令** | 可选后续步骤更新 dev 端口说明（不在本步骤范围） |

---

**结论**：057 验收清单日期与端口已与仓库配置对齐，055/056/057/058 交付日期自洽。
