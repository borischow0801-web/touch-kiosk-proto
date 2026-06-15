# 044 · Step 13 群众端请求与页码最终收口

**交付日期**：2026-06-15  
**基于**：043-step13-kiosk-service-guide-acceptance-closure.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

本次仅收口 **kiosk-app** 办事指南三页的请求触发与 page 校验，消除重复请求并强化失效机制。未修改 backend、admin-web、数据库，未开始首页配置或其他新模块。

---

## 二、单一请求触发机制

**文件**：`ItemList.vue`

采用 **单一 `watch` + `planRouteSync()`** 协调所有列表加载，翻页仅 `router.replace`，不直接调用 `loadItems()`。

```
路由 query 变化
  └─ planRouteSync()
       ├─ 非法 scope → invalidate + skip（不发请求）
       ├─ 非法 page   → replace 去掉/修正 page → return（由下一次 watch 触发唯一 load）
       ├─ scope 变化且 URL 残留 page → replace 归 1 → return
       └─ 否则 → loadItems() 一次
```

| 场景 | 事项列表请求次数 |
|---|---|
| 初始进入 | **1** |
| 点击上一页/下一页 | 在已有基础上 **+1** |
| URL `page` 变化 | **+1**（仅 watch 触发） |
| scope 变化 | **+1** |
| 非法 page 修正 URL | 修正后 **1**（修正步不发请求） |

不再依赖 `requestGuard` 容忍重复请求；guard 仅作失效兜底。

---

## 三、requestGuard 失效机制

**文件**：`requestGuard.ts`

```typescript
invalidate()  // seq += 1，立即使在途请求失效
begin()       // seq += 1，返回当前请求 id
isActive(id)  // !disposed && id === seq
```

| 触发点 | 行为 |
|---|---|
| 路由变为非法 | `ItemTypeList` / `ItemList` / `ItemDetail` 调用 `invalidate()` |
| 组件卸载 | `onUnmounted` → `invalidate()` |
| 迟到响应 | `isActive(reqId)` 为 false，不写入 result/types/data/err/notFound/loading |

---

## 四、page 严格语法

**文件**：`guideRoute.ts`

- 正则：`/^[1-9]\d*$/`（完整匹配，**禁止** `parseInt` 部分容错）
- 上限：`9999`

| 输入 | 结果 |
|---|---|
| `2`、`9999` | 合法 |
| `2abc`、`1.5`、`+2`、空白、`0`、负数、`10000` | 非法 → 归第 1 页并移除 URL `page` |
| 缺省 `page` | 视为第 1 页 |

---

## 五、修改文件

| 文件 | 变更 |
|---|---|
| `src/utils/requestGuard.ts` | 新增 `invalidate()` |
| `src/utils/guideRoute.ts` | 严格 page 正则校验 |
| `src/pages/ItemList.vue` | 单一 watch + planRouteSync，翻页仅改 URL |
| `src/pages/ItemTypeList.vue` | 非法路由时 invalidate |
| `src/pages/ItemDetail.vue` | 非法路由时 invalidate |
| `tests/serviceGuide.acceptance.spec.ts` | 请求次数 + 有效转非法场景 |
| `tests/guideRoute.spec.ts` | 严格 page 语法用例 |

---

## 六、请求次数测试

`serviceGuide.acceptance.spec.ts` 新增/强化：

| 用例 | 结果 |
|---|---|
| 初始列表请求次数为 1 | ✅ |
| 点击下一页只新增 1 次 | ✅ |
| scope 切换只新增 1 次 | ✅ |
| 非法 page 修正后只请求 1 次 | ✅ |
| `page=2abc`、`page=1.5` 被拒绝 | ✅ |
| ItemList 有效→非法，迟到结果不写入 | ✅ |
| ItemTypeList 有效→非法，迟到结果不写入 | ✅ |
| ItemDetail 有效→非法，迟到结果不写入 | ✅ |

既有页码恢复、404、竞态、零键盘、admin/public 隔离测试继续通过。

---

## 七、完整验证结果

```bash
cd kiosk-app/tests && npm test
# Test Files  21 passed (21)
# Tests       142 passed (142)

cd kiosk-app && npm run build
# ✓ built

cd backend && npm test -- --runInBand
# Tests: 547 passed (35 skipped)

cd admin-web && npm test
# Tests: 160 passed (160)
```

---

## 八、远程验证

```bash
curl -i http://10.217.19.22:5183/
# HTTP/1.1 200 OK — SPA 可访问
```

**限制（如实记录）**：

- 远程 `depts` / `themes` 仍为空配置，**无法**完成人工完整点击链路验收
- 未操作数据库，未声称线上全链路已验收

---

## 九、验收结论

Step 13 请求与页码最终收口 **完成**。单一触发、失效机制、严格 page 语法均有测试覆盖；全量测试与构建无回归。

**本次收口后停止**，未开始首页配置模块。
