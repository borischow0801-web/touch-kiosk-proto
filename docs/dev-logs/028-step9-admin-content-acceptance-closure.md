# 028 · Step 9 Phase 2 内容管理第二次验收收尾

**交付日期**：2026-06-12  
**基于**：027-step9-admin-content-acceptance-fix.md  
**状态**：✅ 完成（本阶段收尾，未进入审核发布）

---

## 一、027 报告遗漏的测试警告

027 记载 **64 tests passed** 且无 stderr 说明，但 Codex 复验时发现以下问题：

| 警告 / 失败 | 出现位置 | 说明 |
|---|---|---|
| `[Vue Router warn]: No match found for location with path ""` | `content.components.spec.ts`、`content.dirtyFields.spec.ts`、`useUnsavedGuard.spec.ts` 卸载阶段 | 测试路由缺少根重定向，`router-view` 销毁时内存历史回落到空路径 |
| `useUnsavedGuard` **「未修改时允许离开」超时** | `useUnsavedGuard.spec.ts` | 未 mock `ElMessageBox.confirm` 且加载后 `dirty` 偶发为 true，守卫挂起 |
| Element Plus **重复安装**（潜在） | 各 mount 测试 | 部分 spec 在 `global.plugins` 再次注册 Element Plus |
| **No active route record**（潜在） | 早期守卫测试 | 未通过 `router-view` 挂载真实路由记录 |

本次收尾后，**连续两次** `admin-web npm test` 的 stderr 中**不再出现** Vue Router、Vue、Element Plus 重复安装或 No active route 类警告（仅保留 npm 环境级 `devdir` 提示，非项目代码问题）。

---

## 二、未保存保护原先遗漏的字段

027 仅在 `title`、`summary`、`body` 的 `el-input` 上绑定 `@update:model-value="markDirty"`。

以下可编辑字段修改后**不会**标记 dirty：

| 字段 | 说明 |
|---|---|
| `subtitle` | 副标题 |
| `categoryId` | 分类 |
| `sortOrder` | 排序 |
| `changeRemark` | 变更说明 |
| `isTop` | 置顶 |
| `isRecommend` | 推荐 |
| `sourceType` | 来源类型 |
| `sourceUrl` | 来源链接 |

`title`、`summary`、`body` 虽有单独绑定，但与其余字段行为不一致，且无法覆盖开关/数字框等控件。

---

## 三、修复方案

### 3.1 全字段 dirty 追踪（`ContentItemFormPage.vue`）

1. 移除 `title` / `summary` / `body` 上的单独 `markDirty` 绑定。
2. 使用 `watch(form, () => markDirty(), { deep: true })`，在 `initializing` 为 `true` 时跳过。
3. `onMounted` 全程 `initializing = true`；`loadItem` **不再**在 `finally` 中提前置 `initializing = false`，由 `onMounted` 统一收尾。
4. 加载与回填结束后 `await nextTick()`，再 `dirty = false`，避免控件同步误标脏。
5. 保存成功 `dirty = false`；`useUnsavedGuard(dirty, submitting)` 在 `submitting` 时直接放行，保存中不弹离开确认。

### 3.2 真实路由守卫测试（`useUnsavedGuard.spec.ts`）

- 通过 `mountContentFormApp()` 挂载 `<router-view />` + 真实 `ContentItemFormPage`。
- 路由表含 `content-items`、`content-item-edit` 及 `/` 重定向。
- 用例：未修改离开、修改后取消停留、修改后确认离开、多字段触发守卫。
- 覆盖 **1 个版本字段**（`body` / `summary`）+ **2 个非版本字段**（`subtitle`、`sortOrder`、`isTop` 等）。
- `beforeEach` mock `ElMessageBox.confirm`，避免未 mock 时挂起。
- **禁止**在 setup 外直接调用 `onBeforeRouteLeave`；**禁止**手工复制守卫逻辑。

### 3.3 组件测试基础设施（`tests/helpers/contentFormTest.ts`）

- `createMemoryHistory('/content/items')` + 根路由重定向。
- `teardownContentFormApp()`：卸载前 `router.replace` 到列表，消除空路径警告。
- Element 控件 stub（`ElSelect` / `ElInputNumber` / `ElSwitch`）支持 `v-model` 双向绑定。
- `tests/setup.ts` 全局仅安装一次 Element Plus；`vitest.config.ts` `dedupe` 含 `element-plus`。

### 3.4 双次保存与全字段 dirty 测试

| 文件 | 新增/调整 |
|---|---|
| `content.components.spec.ts` | 延迟 PUT 100ms，连续两次点击保存，断言 `putCount === 1` |
| `content.dirtyFields.spec.ts` | **11 用例**，覆盖全部 11 个可编辑字段 |
| `content.submitGuard.spec.ts` | **删除**（由组件双次点击测试替代） |

---

## 四、实际修改文件

| 文件 | 说明 |
|---|---|
| `admin-web/src/pages/content/ContentItemFormPage.vue` | 全字段 deep watch dirty、加载生命周期修正 |
| `admin-web/tests/helpers/contentFormTest.ts` | **新增** 共享 mount/teardown/mock |
| `admin-web/tests/useUnsavedGuard.spec.ts` | 重写为真实 router-view 集成测试 |
| `admin-web/tests/content.components.spec.ts` | 使用 helper、双次保存 PUT 测试 |
| `admin-web/tests/content.dirtyFields.spec.ts` | **新增** 全字段 dirty 守卫测试 |
| `admin-web/tests/setup.ts` | 全局 Element Plus 单次注册 |
| `admin-web/tests/vitest.config.ts` | dedupe element-plus |
| `admin-web/tests/content.submitGuard.spec.ts` | **删除** |
| `docs/dev-logs/028-step9-admin-content-acceptance-closure.md` | 本报告 |

**未修改**：`backend/**`、`kiosk-app/**`、数据库、端口与环境配置。

---

## 五、验证命令及结果

### admin-web

```bash
cd admin-web
npm run type-check   # exit 0
npm run build        # exit 0（Rollup chunk >500kB 为既有构建提示）
npm test             # 15 files, 76 tests passed, exit 0（第一次）
npm test             # 15 files, 76 tests passed, exit 0（第二次）
```

两次测试 stderr **无** Vue Router / Element Plus / No active route 警告。

### backend

```bash
cd backend
npm run type-check                    # exit 0
npm test -- --runInBand               # 14 suites passed, 341 tests passed, exit 0
```

### kiosk-app

```bash
cd kiosk-app
npm run build                         # exit 0
npx vue-tsc --noEmit -p tsconfig.check.json  # exit 0
cd tests && npm test                  # 17 files, 91 tests passed, exit 0
```

### 远程 IP 验证

```bash
curl --noproxy '*' http://10.217.19.22:5183/                        # HTTP 200
curl --noproxy '*' http://10.217.19.22:5183/api/public/home/config  # HTTP 200
curl --noproxy '*' http://10.217.19.22:5184/login                    # HTTP 200
curl --noproxy '*' http://10.217.19.22:3100/api/admin/auth/profile  # HTTP 401, body.code=401
```

---

## 六、仍存在的非阻塞项

| 项 | 说明 |
|---|---|
| `npm warn Unknown env config "devdir"` | 运行环境 npmrc 配置提示，非本项目代码 |
| Vite `chunk > 500 kB` | admin-web 构建体积提示，非本次引入 |
| 分类超 2000 条 | 运营侧控制或后续全量接口（027 已记录） |
| `extraJson` 表单 UI | 未展示，回显但不主动提交（027 已记录） |
| **审核发布** | **本阶段明确不进入** |

---

## 七、跨工程变更声明

| 工程 | 是否修改 |
|---|---|
| `admin-web/` | **是** |
| `backend/` | **否** |
| `kiosk-app/` | **否** |
| 数据库 | **否** |

**数据库访问**：未执行任何 SQL，未连接任何项目数据库。
