# 021 · Step 8 kiosk-app 政务公开安全与导航收口

**交付日期**：2026-06-12  
**基于**：020-step8-kiosk-public-content.md  
**状态**：✅ 完成

---

## 一、任务目标

在 Step 8 政务公开页面接入基础上，完成正文 HTML 白名单安全清理、底部导航临时状态语义收口、非法路由友好降级、仅列表模块非交互展示，并补充可执行的安全与行为测试。

---

## 二、020 文件清单勘误

020 dev-log 所列 `src/content/public-content.service.ts` **实际不存在**，属于文件清单误写。  
群众端政务公开 API 调用集中在 `src/api/endpoints.ts`（`getPublicContentList` / `getPublicContentDetail`），模块映射在 `src/content/modules.ts`。

---

## 三、修改文件清单

### 新增（kiosk-app）

| 文件 | 说明 |
|---|---|
| `src/app/useBottomNav.ts` | `resetKioskSession`、`goNav`（首页清状态 / 返回仅 back） |
| `src/components/KioskBottomNav.vue` | 底部导航（因 `BottomNav.vue` 为 root 拥有不可写，新建等价组件） |
| `src/components/ContentRouteFallback.vue` | 非法路由友好错误页 + 返回首页 |
| `src/components/ContentListItem.vue` | 可点击 `button` / 仅列表 `article` |
| `tests/contentList.behavior.spec.ts` | 非法路由行为测试 |
| `tests/contentDetail.behavior.spec.ts` | 非法/不支持详情行为测试 |
| `tests/contentListItem.behavior.spec.ts` | 列表卡片交互/非交互组件测试 |
| `tests/navigation.behavior.spec.ts` | 首页/返回/重来状态语义 |
| `tests/safeBody.behavior.spec.ts` | SafeBody 组件安全展示 |
| `tests/setup.ts` | vitest 统一 Pinia 实例 |

### 修改（kiosk-app）

| 文件 | 说明 |
|---|---|
| `src/utils/sanitizeBody.ts` | 重写白名单清理、危险标签删除、DOMParser 降级 |
| `src/components/SafeBody.vue` | 无 DOMParser 时纯文本转义 |
| `src/pages/ContentList.vue` | 非法路由 fallback、`ContentListItem`、`listLoadingLock`、路由 watch 拆分 |
| `src/pages/ContentDetail.vue` | 非法/不支持详情 fallback（不再 `router.replace` 白屏） |
| `src/App.vue` | 使用 `KioskBottomNav`；重来/空闲调用 `resetKioskSession` |
| `tests/sanitizeBody.spec.ts` | 扩展 XSS 向量用例 |
| `tests/router.spec.ts` | 详情非法类型改为 fallback 断言 |
| `tests/vitest.config.ts` | Vue 插件、setup、dedupe/alias |
| `tests/package.json` | 行为测试依赖（@vue/test-utils、happy-dom 等） |
| `CLAUDE.md` | Step 8 安全与导航收口状态 |

### 未修改

- `backend/`、`admin-web/`、数据库、迁移、授权  
- Public API 路径与后端契约  
- `oms_db`、`mydb` 及其他项目数据库（未访问）

---

## 四、最终 HTML 清理规则（`sanitizePublicBody`）

1. **危险标签整体删除**（不解包）：`script`、`iframe`、`object`、`embed`、`form`、`style`、`link`、`meta`、`base`、`frame`、`svg`、`math`、`input`、`textarea`、`button`、`img`、`a`、`audio`、`video` 等。
2. **允许标签白名单**：`p`、`br`、`strong`、`b`、`em`、`i`、`ul`、`ol`、`li`、`h2`、`h3`、`blockquote`、`span`。
3. **非白名单标签**：解包后**递归**清理子节点（子节点中的事件属性、script 等仍会被处理）。
4. **允许标签属性**：默认移除全部属性；不保留 `style`、`class`、`id`、`src`、`href`、`on*` 等。
5. **解析前预删**：`preStripDangerousMarkup` 在 DOMParser 解析前移除 `script`/`iframe`/`object`/`embed`，避免测试环境执行脚本。
6. **DOMParser 不可用**：剥离标签后 `escapeHtmlText`，禁止返回未清理的原始 HTML。
7. **SafeBody**：纯文本走转义；HTML 走 `sanitizePublicBody`；`pointer-events: none` 防止触摸触发残留节点。

---

## 五、底部导航临时状态语义

| 操作 | guideStore | contentStore（listType/page/detailId） | 说明 |
|---|---|---|---|
| **首页** | `$reset()` | `reset()` 全部清空 | `goNav('/home')` 调用 `resetKioskSession` |
| **返回** | 保留 | 保留页码与 listType | 仅 `router.back()` |
| **重来** | 清空 | 清空 | 跳转 `/home?reset=1`，`App.vue` 调用 `resetKioskSession` |
| **90 秒超时** | 清空 | 清空 | `useIdleHome` 回首页时 `resetKioskSession` |

`ContentRouteFallback` 的「返回首页」按钮同样执行 `guideStore.$reset()` + `contentStore.reset()`。

---

## 六、非法路由处理

| 路由 | 行为 |
|---|---|
| `/content/unknown` | `ContentList` 设 `invalidRoute`，展示 `ContentRouteFallback`（页面不存在），**不请求**列表 API |
| `/content/unknown/:id` | `ContentDetail` 设 `invalidRoute`，展示 fallback，**不请求**详情 API |
| `/content/open-guide/:id` 等仅列表类型 | `supportsDetail=false` → `invalidRoute`，展示 fallback，**不请求**详情 API |

不再 `router.replace` 或抛出未处理异常，避免白屏。

---

## 七、仅列表模块展示

- `ContentList` 对 `supportsDetail=false` 的模块：`ContentListItem` 使用 `<article>`，展示 `summary`，**不**渲染可点击按钮。
- 不支持详情的路由进入详情页时直接 fallback，不调用 `getPublicContentDetail`。

---

## 八、新增 / 扩展安全与行为测试

### `sanitizeBody.spec.ts`（12 用例）

- 外层包裹 `span onclick`
- 多层嵌套事件属性
- `style="position:fixed"`
- style 中外部 URL
- SVG / MathML
- 大小写混合 `on*`
- 无引号事件属性
- `javascript:` / `data:`
- `script` 节点及内容删除
- 允许标签不保留 class/id
- 危险标签解包后子节点递归清理
- DOMParser 不存在时转义降级

### 行为测试（组件 / 路由）

| 文件 | 覆盖点 |
|---|---|
| `safeBody.behavior.spec.ts` | 恶意 HTML 清理后展示、纯文本转义 |
| `navigation.behavior.spec.ts` | 首页清状态、返回保留页码、重来跳转 reset |
| `contentList.behavior.spec.ts` | `/content/unknown` 友好错误、零 API 请求 |
| `contentDetail.behavior.spec.ts` | 未知类型/仅列表详情非法路由 |
| `contentListItem.behavior.spec.ts` | `article` vs `button`、`activate` 事件 |

---

## 九、构建与测试结果

| 命令 | 结果 |
|---|---|
| `cd kiosk-app && npm run build` | ✅ 通过 |
| `npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ 通过 |
| `cd kiosk-app/tests && npm test` | ✅ **15** 文件 / **79** 用例通过 |
| `cd backend && npm run type-check` | ✅ 通过 |
| `cd backend && npm test -- --runInBand` | ✅ **341** 通过（35 skipped） |

---

## 十、未完成风险

1. **Vitest 双 Vue 实例**：`tests/node_modules` 与 `kiosk-app/node_modules` 各有一套 Vue，`onMounted` 在部分行为测试中不触发；列表数据加载的端到端 mount 测试改为组件级 `ContentListItem` + 非法路由测试。生产运行时 `onMounted` + 路由 watch 正常。
2. **`BottomNav.vue` / 根目录 `package.json`** 为 root 拥有，无法直接修改；底部导航通过 `KioskBottomNav.vue` 接入。
3. **封面图**：详情页 `coverFileId` 仍为占位文案，待 FileModule 接入。

---

## 十一、人工验证建议

- [ ] 详情正文含嵌套恶意 HTML 不可执行、无全屏 style
- [ ] 底部「首页」后办事指南与政务公开状态已清空
- [ ] 「返回」回到列表原页码
- [ ] 「重来」与 90 秒超时清空临时状态
- [ ] 访问 `/content/unknown` 与 `/content/unknown/id` 显示友好页
- [ ] 信息公开指南等仅列表卡片无无效点击

---

## 十二、确认范围

- ✅ 仅修改 `kiosk-app/src/`、`kiosk-app/tests/`、`kiosk-app/tsconfig.check.json`、`CLAUDE.md`、本 dev-log  
- ✅ 未修改 backend、admin-web、数据库  
- ✅ 无密码或凭据写入本文档
