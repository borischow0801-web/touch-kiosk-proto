# 043 · Step 13 群众端办事指南交互验收修复

**交付日期**：2026-06-15  
**基于**：042-step13-kiosk-service-guide-integration.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

本次仅修改 **kiosk-app** 及测试，针对 042 验收反馈修复交互与健壮性问题：

- 列表页码保留与 URL 同步
- 异步请求竞态消除
- 结构化 `ApiError`
- 路由参数加固
- 去除重复加载

未修改 backend、admin-web、数据库。

---

## 二、页码保存方案

**双写：URL query + guideStore**

| 字段 | 说明 |
|---|---|
| `guideStore.listScopeKey` | 如 `dept:D-001:query` / `theme:T-001:apply` |
| `guideStore.listPage` | 当前页码 |
| URL `page` | 大于 1 时写入 query，供返回与刷新恢复 |

**行为规则**（`ItemList.vue`）：

| 场景 | 处理 |
|---|---|
| 翻页 | `goToPage()` → `router.replace` 更新 query → `loadItems()` |
| 进入详情 | 当前 URL 已含 `page`，`router.back()` 原样恢复 |
| 部门/主题/事项类型变化 | `listScopeKey` 变化 → 重置第 1 页，剥离非法 `page` query |
| 首页 / 重来 / 90s 超时 | `guideStore.$reset()` 清空 `listScopeKey`、`listPage` |
| 刷新合法 `page` URL | scope watch 同步 query → 加载对应页 |
| 非法 `page`（非数字、≤0、超长） | `parsePageQuery` 归 1，`isInvalidPageQuery` 触发 URL 修正 |

政务公开 `ContentList` 仍使用 `contentStore.rememberList`，未改动。

---

## 三、请求竞态解决方案

新增 `kiosk-app/src/utils/requestGuard.ts`：

- 每次请求 `begin()` 递增序号
- 路由参数变化或组件 `onUnmounted` 时递增序号 / 标记 disposed
- 仅 `isActive(reqId)` 为真时写入 `loading` / `result` / `err`

应用于：

- `ItemTypeList.vue`
- `ItemList.vue`
- `ItemDetail.vue`

移除会阻塞新路由请求的 `loadingLock`；翻页与 scope 变更始终可发起正确请求。

去除 `watch immediate` + `onMounted` 双重加载，各页仅保留单一 watch 入口。

---

## 四、ApiError 结构

文件：`kiosk-app/src/api/errors.ts`，由 `client.ts` 抛出。

```typescript
class ApiError extends Error {
  readonly httpStatus?: number  // HTTP 状态
  readonly code?: number       // 业务 code
  get isNotFound(): boolean    // httpStatus===404 || code===404
}
```

| 类型 | 处理 |
|---|---|
| HTTP / 业务 404 | `ApiError`，`isNotFound === true` |
| 502 / 503 / 504 | `ApiError` + `formatApiErrorMessage` 友好文案 |
| 500 且 message 含「不存在」 | **不**视为 404，显示可重试错误 |
| 网络失败 / 超时 | 普通 `Error`，固定友好文案 |
| 响应正文 / 堆栈 | 不向页面暴露 |

`ItemDetail` 仅以 `isApiError(e) && e.isNotFound` 展示「事项不存在」，已删除中文文案匹配。

---

## 五、路由参数规则

文件：`kiosk-app/src/utils/guideRoute.ts`

| 规则 | 实现 |
|---|---|
| 单值提取 | `extractQueryString` — 拒绝多元素数组、对象、空白 |
| 格式校验 | `GUIDE_CODE_RE`（≤50）、`ITEM_ID_RE`（≤60） |
| dept + theme 同时有效 | `resolveItemTypeContext` 返回 `null` → 回退 UI，不发请求 |
| 重复 query 数组 | 如 `deptCode=A&deptCode=B` → 非法 |
| 列表上下文 | `resolveItemListContext` + `buildListScopeKey` |
| 非法参数 | `ContentRouteFallback`，不调用 API |

---

## 六、修改文件

| 文件 | 变更 |
|---|---|
| `src/api/errors.ts` | **新增** ApiError |
| `src/api/client.ts` | 抛出 ApiError |
| `src/utils/requestGuard.ts` | **新增** 请求序号守卫 |
| `src/utils/guideRoute.ts` | 安全提取、互斥校验、page 解析 |
| `src/stores/guide.ts` | `listScopeKey`、`listPage`、`rememberListPage` |
| `src/pages/ItemList.vue` | URL 页码、goToPage、竞态守卫、拆分 watch |
| `src/pages/ItemTypeList.vue` | 竞态守卫、加固 query、去除重复加载 |
| `src/pages/ItemDetail.vue` | ApiError 404、竞态守卫、去除重复加载 |
| `tests/serviceGuide.acceptance.spec.ts` | **新增** 验收修复专项测试 |
| `tests/serviceGuide.lifecycle.spec.ts` | 页码状态、waitLoaded 增强 |
| `tests/guideRoute.spec.ts` | 互斥/数组/非法 page |
| `tests/apiError.spec.ts` | ApiError 结构测试 |

---

## 七、新增测试

`serviceGuide.acceptance.spec.ts` 覆盖：

| 用例 | 结果 |
|---|---|
| 第 2 页进详情返回仍为第 2 页 | ✅ |
| 第 3 页进详情返回仍为第 3 页 | ✅ |
| 切换事项类型后重置第 1 页 | ✅ |
| 合法 `page=3` 刷新恢复 | ✅ |
| 非法 `page=abc` 归 1 并修正 URL | ✅ |
| 首页导航清理 listPage | ✅ |
| 旧请求晚返回不覆盖新路由数据 | ✅ |
| 卸载后迟到的请求不写入状态 | ✅ |
| HTTP 404 结构化识别 | ✅ |
| HTTP 500 含「不存在」不误判 404 | ✅ |
| 同时 deptCode + themeCode 回退且无请求 | ✅ |
| 重复 deptCode 数组不崩溃且无请求 | ✅ |

既有 `no-keyboard.spec.ts`、`api-endpoints.spec.ts`（admin/public 隔离）继续通过。

---

## 八、完整验证结果

```bash
cd kiosk-app/tests && npm test
# Test Files  21 passed (21)
# Tests       133 passed (133)

cd kiosk-app && npm run build
# ✓ built in 1.95s

cd backend && npm test -- --runInBand
# Tests: 547 passed (35 skipped)

cd admin-web && npm test
# Tests: 160 passed (160)
```

---

## 九、远程验证

| 检查项 | 结果 |
|---|---|
| `GET http://10.217.19.22:5183/` | HTTP **200**，SPA 可访问 |
| 远程完整业务点击链路 | **未完成** — 041/042 已确认 `depts`/`themes` 返回 `[]`，未配置部门/主题，不得操作数据库，**不得声称线上完整链路已验收** |
| 空状态 UI | 代码与测试覆盖；远程应显示「暂无部门/主题配置」 |

---

## 十、风险与说明

| 项 | 说明 |
|---|---|
| 列表翻页可能触发重复请求 | `goToPage` 与 `page` watch 各触发一次 load；`requestGuard` 保证仅最新结果生效 |
| 远程 E2E | 需管理端配置部门/主题后方可人工走通全路径 |
| 共享平台 / 二期功能 | 未涉及 |

---

## 十一、验收结论

Step 13 交互验收修复 **通过**：页码保留、竞态防护、结构化错误、路由加固均有实现与测试支撑；全量测试与构建无回归；远程 SPA 可访问，如实记录无法完成远程完整业务链路验收。
