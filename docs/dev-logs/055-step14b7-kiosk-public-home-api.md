# 055 · Step 14B-7 群众端首页对接 Public Home API

**交付日期**：2026-06-16  
**基于**：054-step14b6-admin-home-config-page.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

将 kiosk-app 首页从本地/mock/硬编码模式调整为优先调用 `GET /api/public/home/config`；当 HTTP 503、响应 `code=503`、网络失败或数据结构异常时，自动回退本地离线配置，保证不白屏。

**未修改**：backend、admin-web、deploy、基线文档（`database.md` / `architecture.md` / `api-spec.md` / `CLAUDE.md`）、Entity、Migration、端口配置。

---

## 二、修改文件清单

### 新增

| 文件 | 说明 |
|---|---|
| `kiosk-app/src/config/offlineHomeConfig.ts` | 本地离线兜底配置（含 guide/content 模块、导航；`homeHotItems` 为空） |
| `kiosk-app/src/stores/homeConfig.ts` | Pinia 共享 store，`ensureLoaded()` 单例 Promise 避免重复请求 |
| `kiosk-app/src/utils/homeConfig.ts` | API 响应规范化与离线兜底判定 |
| `kiosk-app/src/utils/homeModuleNav.ts` | 模块 `targetType` → 路由跳转 |
| `kiosk-app/tests/publicHomeConfig.spec.ts` | Public Home API 对接与兜底测试 |

### 修改

| 文件 | 说明 |
|---|---|
| `kiosk-app/src/App.vue` | 改用 `homeConfig` store 驱动 header / nav / idleSeconds |
| `kiosk-app/src/pages/Home.vue` | 渲染 `homeHotItems`、`modules`、`noticeSummaries`；移除独立 fetch 与错误阻断页 |
| `kiosk-app/src/api/types.ts` | 扩展 `AppConfig`、`PublicHomeModule`、`PublicNoticeSummary`；`HotItem` 对齐 `itemId` |
| `kiosk-app/src/api/errors.ts` | 新增 `isServiceUnavailable()` |
| `kiosk-app/tests/helpers/publicApiMock.ts` | 远程/503/网络 mock 辅助与 `MOCK_REMOTE_HOME_CONFIG` |
| `kiosk-app/tests/api-endpoints.spec.ts` | 断言首页仅调用 `/api/public/home/config` |
| `kiosk-app/tests/homeNavigation.spec.ts` | 改为验证离线配置含全部政务公开入口 |
| `kiosk-app/tests/sessionReset.lifecycle.spec.ts` | mock 数据补齐新字段 |

### 交付报告

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/055-step14b7-kiosk-public-home-api.md` | 本报告 |

---

## 三、Public Home API 对接方式

1. **唯一入口**：`getConfig()` → `GET /api/public/home/config`（`kiosk-app/src/api/endpoints.ts`，未改动路径）。
2. **共享加载链路**：`App.vue` 在 `onMounted` 调用 `useHomeConfigStore().ensureLoaded()`；`Home.vue` 只读 `effectiveConfig`，不再独立请求。
3. **字段映射**（经 `normalizeAppConfig` 校验后使用）：

| API 字段 | 群众端用途 |
|---|---|
| `title` / `subtitle` | 顶部标题区 |
| `bannerLines` | 顶部横幅提示行 |
| `theme` | 预留主题配置（当前仅存储，未改 UI 皮肤） |
| `modules` | 中部模块按钮网格（`route` / `content` 跳转） |
| `homeHotItems` | 高频事项列表（`itemId` → `/items/:id`） |
| `noticeSummaries` | 通知公告摘要（→ `/content/notices/:id`） |
| `nav` / `idleSeconds` | 底部导航与 90 秒无操作回首页 |

4. **模块跳转规则**：
   - `targetType=route` + `targetValue=/depts` 等 → `router.push(targetValue)`
   - `targetType=content` + `targetValue=policies` 等 → `/content/:segment`

---

## 四、503 / 网络失败兜底策略

| 场景 | 处理方式 |
|---|---|
| HTTP 503 或 `code=503` | `shouldUseOfflineFallback` → `OFFLINE_HOME_CONFIG`，`source='offline'` |
| 网络超时 / 断网 | fetch 抛错 → 同上 |
| 响应 JSON 结构异常（缺 title/nav 等） | `normalizeAppConfig` 返回 null → 同上 |
| 加载中 | `effectiveConfig` getter 在 `config` 为空时亦返回离线配置，避免空白 |

离线配置保留原有办事指南入口（按部门/按主题）及 9 个政务公开模块，与此前硬编码行为等价。`homeHotItems` 为空数组，离线时不展示可能误导群众的示例高频事项。

---

## 五、群众端零键盘约束检查结果

- 未新增 `<input>`、`<textarea>`、`contenteditable` 控件。
- `tests/no-keyboard.spec.ts`：17 个 Vue 文件全部通过扫描。
- 首页所有操作仍为 BigButton 点击；主交互区位于中部 68vh。

---

## 六、是否修改 backend / admin-web / database / deploy

| 范围 | 是否修改 |
|---|---|
| backend | **否** |
| admin-web | **否** |
| 数据库脚本 / Entity / Migration | **否** |
| deploy | **否** |
| 基线文档 | **否**（仅新增本 dev-log） |

---

## 七、测试和构建结果

| 命令 | 结果 |
|---|---|
| `git diff --check` | 通过 |
| `cd kiosk-app/tests && npm test -- --run` | **150 / 150 通过**（含 `publicHomeConfig.spec.ts` 6 项） |
| `cd kiosk-app && npm run build` | 通过 |

### 新增测试覆盖

- 成功请求后渲染远程 `title` / 模块 / 高频事项 / 通知
- HTTP 503 → 离线 `title`
- 网络失败 → 离线配置且不显示「数据加载失败」阻断
- App + Home 仅 1 次 `/api/public/home/config` 请求
- fetch 不调用 `/api/admin/*`
- 模块 `route` / `content` 跳转
- 零键盘扫描（既有用例）

---

## 八、未完成事项和下一步建议

| 项 | 说明 |
|---|---|
| `theme` 视觉应用 | 当前仅接收并存储，未映射到 CSS 变量或组件配色 |
| 通知详情路由 | 点击通知跳转 `/content/notices/:id`，依赖 ContentModule 后续实现 notices 类型公开接口 |
| `targetType=external` | 预留分支，一期不打开外链 |
| 管理端发布后联调 | 见 `057-step14b8-home-config-e2e-acceptance-plan.md` 真实链路验收清单 |
| `theme` 视觉应用 | **暂缓**，待用户补充 UI 设计要求后再启动 |
| ContentModule | 继续 notices 等内容类型的群众端列表/详情页对接 |

---

**结论**：群众端首页已优先对接 Public Home API，失败场景均有离线兜底，单一加载链路消除重复请求，测试与构建均通过。
