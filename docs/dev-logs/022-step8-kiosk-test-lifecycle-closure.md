# 022 · Step 8 kiosk-app 测试基础设施与生命周期验收收口

**交付日期**：2026-06-15  
**基于**：021-step8-kiosk-security-navigation-closure.md  
**状态**：✅ 完成

---

## 一、双 Vue 根因及解决方式

### 根因

`kiosk-app/tests/package.json` 在 `tests/node_modules/` 内**独立安装**了 `vue`、`pinia`、`vue-router`，而 `@vue/test-utils` 又依赖自己的 `vue` 副本。被测 SFC 经 Vite 从 `kiosk-app/node_modules/vue` 解析，测试运行器与 `mount()` 却使用另一套 Vue runtime，导致：

- `onMounted` 钩子挂载到 A 实例、DOM 更新走 B 实例 → 测试中生命周期“不执行”
- `ref` 异步赋值后模板不刷新
- `await getPublicContentList()` 在测试里已 resolve，组件仍停留「加载中...」

### 解决方式

1. **tests/package.json**：移除独立 Vue 栈；`vue` / `pinia` / `vue-router` 改为 `file:../node_modules/...` 符号链接，强制与主工程同实例。
2. **vitest.config.ts**：`root` 指向 `kiosk-app/`；`resolve.dedupe` + `alias` 统一解析；`pool: 'forks'` 隔离进程。
3. **vue-runtime.smoke.spec.ts**：`onMounted` 冒烟测试作为回归门禁。
4. **缓存**：`cacheDir` 保留在 `tests/.vitest-cache`（可写目录），并已加入 `.gitignore`。

验证：`tests/node_modules/vue` → `../../node_modules/vue`；`@vue/test-utils` 下**无**嵌套 `vue`。

---

## 二、修改文件

### 测试基础设施

| 文件 | 说明 |
|---|---|
| `tests/package.json` | 依赖改 `file:` 指向主工程 Vue 栈 |
| `tests/vitest.config.ts` | dedupe/alias/forks/cacheDir |
| `tests/setup.ts` | （保留）统一 Pinia |
| `tests/helpers/publicApiMock.ts` | `fetch` 桩与列表/详情数据工厂 |
| `tests/vue-runtime.smoke.spec.ts` | onMounted 冒烟 |
| `kiosk-app/.gitignore` | 忽略 dist、vitest 缓存 |
| `.gitignore`（仓库根） | 忽略 `kiosk-app/tests/.vitest-cache` |

### 极小 src 调整（可测试性，无业务行为变更）

| 文件 | 说明 |
|---|---|
| `src/pages/ContentDetail.vue` | 与 ContentList 一致：`resolveRoute`（immediate）+ `onMounted(scheduleDetailLoad)` |
| `src/app/useIdleHome.ts` | 注入 `Router` 参数，避免硬编码 `import router` 导致测试 router 不一致 |
| `src/App.vue` | `useIdleHome(router, ...)` 传入 setup 中的 router |

### 新增生命周期测试

| 文件 | 说明 |
|---|---|
| `tests/contentList.lifecycle.spec.ts` | ContentList 完整行为（见下节） |
| `tests/contentDetail.lifecycle.spec.ts` | ContentDetail 完整行为 |
| `tests/sessionReset.lifecycle.spec.ts` | 重来 reset=1、90s 空闲清理 |

### 删除/合并

| 文件 | 说明 |
|---|---|
| `tests/contentList.behavior.spec.ts` | 合并入 `contentList.lifecycle.spec.ts` |
| `tests/contentDetail.behavior.spec.ts` | 合并入 `contentDetail.lifecycle.spec.ts` |
| `tests/.vitest-cache/` | 已删除（运行时重建，不跟踪） |

### 保留并通过

- `sanitizeBody.spec.ts`、`safeBody.behavior.spec.ts`
- `navigation.behavior.spec.ts`（首页/返回/重来跳转）
- `contentListItem.behavior.spec.ts`
- 其余静态/模块测试

---

## 三、新增真实生命周期测试

### ContentList（`contentList.lifecycle.spec.ts`）

| 用例 | 验证点 |
|---|---|
| onMounted 自动请求 | `GET /api/public/content/policies?page=1&pageSize=10` |
| 加载成功 | 渲染列表标题 |
| 空数据 | 「暂无相关内容」 |
| 失败 + 重试 | 错误文案 → 点击重试 → 二次请求成功 |
| 分页边界 | 1/3 → 下一页 `page=2` → 上一页 `page=1` |
| 详情导航 | 政策卡片点击 → `/content/policies/:id` |
| 仅列表 | `open-guide` 为 `article`，无详情跳转 |
| 非法路由 | `/content/unknown` fallback，零请求 |

### ContentDetail（`contentDetail.lifecycle.spec.ts`）

| 用例 | 验证点 |
|---|---|
| onMounted 请求 | `GET /api/public/content/policies/:id` |
| 成功渲染 | 标题、摘要、`.safe-body` 正文 |
| 空字段 | 「暂无相关信息」 |
| 失败 + 重试 | 「内容加载失败」→ 重试成功 |
| 非法路由 | unknown / open-guide 详情，零请求 |

### 会话清理（`sessionReset.lifecycle.spec.ts`）

| 用例 | 验证点 |
|---|---|
| 重来 `reset=1` | 挂载真实 `App.vue` → 清理 guide/content → `replace('/home')` |
| 90s 空闲 | `vi.useFakeTimers` + 91000ms → 清理两 store → `router.push('/home')` |

---

## 四、Vue runtime 警告

全量测试运行后：

- **无**「duplicate Vue」或「onMounted 不执行」类已知风险
- 仅有 Tailwind `content` 配置为空的标准 warn（与 Vue 无关）
- **无** Vue 版本 mismatch 警告

---

## 五、构建与测试数量

| 命令 | 结果 |
|---|---|
| `cd kiosk-app && npm run build` | ✅ 通过 |
| `npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ 通过 |
| `cd kiosk-app/tests && npm test` | ✅ **17** 文件 / **91** 用例通过 |
| `cd backend && npm run type-check` | ✅ 通过 |
| `cd backend && npm test -- --runInBand` | ✅ **341** 通过（35 skipped） |

---

## 六、未完成风险

1. **Tailwind content 警告**：测试环境未配置 `content` 路径，不影响断言，但控制台有 css 提示。
2. **tests/package-lock.json**：随 `file:` 依赖更新；不提交 `tests/node_modules`（已在 `.gitignore`）。
3. **封面图**：详情页封面仍为占位，与 021 相同。

---

## 七、确认范围

- ✅ 仅修改 `kiosk-app/tests/`、测试配置、极小 `src/` 可测试性调整、`CLAUDE.md`、本 dev-log
- ✅ 未修改 backend、admin-web、数据库、迁移
- ✅ 未访问 `oms_db`、`mydb` 或其他项目数据库
- ✅ 无密码或凭据
