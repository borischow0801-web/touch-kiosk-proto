# 056 · Step 14B-7a 群众端 Public Home API 验收收口

**交付日期**：2026-06-16  
**基于**：055-step14b7-kiosk-public-home-api.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

对 Step 14B-7 群众端首页 Public Home API 对接进行小范围验收修复，不新增业务功能。

**未修改**：backend、admin-web、deploy、基线文档（`database.md` / `architecture.md` / `api-spec.md` / `CLAUDE.md`）、Entity、Migration、端口配置。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `kiosk-app/src/config/offlineHomeConfig.ts` | `homeHotItems` 改为空数组，移除示例高频事项 |
| `kiosk-app/tests/publicHomeConfig.spec.ts` | 模块跳转测试补全 `/home` 路由；503 场景断言不含「示例」 |
| `kiosk-app/tests/homeNavigation.spec.ts` | 新增离线兜底不含示例高频事项断言 |
| `docs/dev-logs/055-step14b7-kiosk-public-home-api.md` | 修正交付日期；同步离线兜底说明 |
| `docs/dev-logs/056-step14b7a-kiosk-home-api-acceptance-closure.md` | 本报告 |

---

## 三、离线兜底内容调整说明

| 项 | 调整前 | 调整后 |
|---|---|---|
| `homeHotItems` | 6 条带「（示例）」后缀的高频事项 | **空数组 `[]`** |
| 按部门查 / 按主题查 | 保留 | 保留 |
| 政务公开 9 模块 | 保留 | 保留 |
| 底部导航 | 保留 | 保留 |
| `idleSeconds` | 90 | 90（不变） |
| `bannerLines` | 中性提示文案 | 不变 |

离线模式下首页仅展示模块入口（办事指南 + 政务公开），不再出现可能误导群众的虚构事项名称。远程 API 成功时仍正常展示后端配置的 `homeHotItems`。

---

## 四、测试 warning 是否已消除

**已消除。**

`publicHomeConfig.spec.ts` 中「模块点击按配置跳转」用例原先在 `router.push('/home')` 时未注册 `/home` 路由，导致 stderr 输出：

```
[Vue Router warn]: No match found for location with path "/home"
```

修复：该测试路由表增加 `{ path: '/home', component: Home }`。

复测 `cd kiosk-app/tests && npm test -- --run` 输出中**不再出现**上述 warning。

---

## 五、零键盘约束检查结果

- 本次未修改任何 Vue 页面组件，未新增 `input` / `textarea` / `contenteditable`。
- `tests/no-keyboard.spec.ts`：17 个 Vue 文件全部通过。

---

## 六、是否修改 backend / admin-web / database / deploy

| 范围 | 是否修改 |
|---|---|
| backend | **否** |
| admin-web | **否** |
| 数据库 Entity / Migration / SQL | **否** |
| deploy | **否** |

---

## 七、验证命令和结果

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |
| `cd kiosk-app/tests && npm test -- --run` | **151 / 151 通过**（+1 新增断言） |
| `cd kiosk-app && npm run build` | 通过 |

---

## 八、055 报告修正（14B-7a / 14B-8a 收口）

- **交付日期**：055、056 曾误写 `2026-06-12`（早于依赖步骤 054 的 `2026-06-16`）；现统一为 **`2026-06-16`**，与 054 及后续步骤自洽。
- **离线兜底描述**：同步注明 `homeHotItems` 为空、不展示示例事项。

---

## 九、下一步建议

| 项 | 说明 |
|---|---|
| 真实环境联调 | 见 `057-step14b8-home-config-e2e-acceptance-plan.md` |
| `theme` 视觉应用 | **暂缓**，待用户补充 UI 设计要求后再启动 |
| ContentModule | 继续 notices 等内容类型的群众端列表/详情对接 |

---

**结论**：Step 14B-7 验收收口完成。离线兜底不再展示误导性示例事项，测试 warning 已消除，验证全部通过。
