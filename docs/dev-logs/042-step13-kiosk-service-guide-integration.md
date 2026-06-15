# 042 · Step 13 群众端办事指南联调与验收

**交付日期**：2026-06-15  
**基于**：040-step12-service-guide-pagination-closure.md、041-step12-database-runtime-acceptance.md  
**执行方**：Codex  
**状态**：通过

---

## 一、执行范围

本次仅修改 **kiosk-app** 及测试，复用既有 5 个办事指南页面，不新建功能重复页面，不修改 backend / admin-web / 数据库。

目标：基于已验收的 `/api/public/service-guide/*` 接口，完善并验收完整触摸查询流程：

```
首页 → 按部门查 / 按主题查 → 事项类型 → 事项列表 → 事项详情
```

---

## 二、修改文件

### 页面（复用增强，未新建）

| 文件 | 改动摘要 |
|---|---|
| `kiosk-app/src/pages/DeptList.vue` | 加载/空/错误/重试；`loadingLock` + `navigating` 防重复；空部门提示 |
| `kiosk-app/src/pages/TopicList.vue` | 同上；空主题提示 |
| `kiosk-app/src/pages/ItemTypeList.vue` | 部门/主题双模式；路由参数校验 + `ContentRouteFallback` |
| `kiosk-app/src/pages/ItemList.vue` | 分页（`PAGE_SIZE=10`）；防重复请求/导航；空列表提示 |
| `kiosk-app/src/pages/ItemDetail.vue` | 13 个顶层字段完整展示；404 单独态；空字段「暂无相关信息」 |

### 工具与 API

| 文件 | 改动摘要 |
|---|---|
| `kiosk-app/src/utils/apiError.ts` | **新增** — 502/503/504/404 友好文案 |
| `kiosk-app/src/utils/guideRoute.ts` | **新增** — deptCode/themeCode/itemId 校验 |
| `kiosk-app/src/api/client.ts` | 集成 `formatApiErrorMessage` |
| `kiosk-app/src/components/ContentRouteFallback.vue` | 非法路由安全降级 UI（Step 8 已有，本步复用） |
| `kiosk-app/src/app/useBottomNav.ts` | 首页/重来/超时调用 `guideStore.$reset()` |
| `kiosk-app/src/App.vue` | `reset=1` 与 `useIdleHome` 联动清理临时状态 |

### 测试

| 文件 | 改动摘要 |
|---|---|
| `kiosk-app/tests/helpers/publicApiMock.ts` | `stubServiceGuideFetch`、办事指南 mock 数据 |
| `kiosk-app/tests/serviceGuide.lifecycle.spec.ts` | **新增** — 完整链路、空态、分页、详情、错误、防重复、路由安全 |
| `kiosk-app/tests/apiError.spec.ts` | **新增** — 错误文案 |
| `kiosk-app/tests/guideRoute.spec.ts` | **新增** — 路由参数校验 |
| `kiosk-app/tests/api-endpoints.spec.ts` | 增加 service-guide 路径断言 |
| `kiosk-app/tests/no-keyboard.spec.ts` | 既有 — 全 src 零键盘扫描（17 用例） |
| `kiosk-app/tests/sessionReset.lifecycle.spec.ts` | 既有 — 重来/90s 超时清理 guideStore |

---

## 三、页面调用链路

### 按部门查

```
/home
  └─ 点击「按部门查」
/depts
  └─ GET /api/public/service-guide/depts
  └─ 点击部门卡片 → guideStore 写入 deptCode/deptName
/item-types?deptCode={code}
  └─ GET /api/public/service-guide/depts/{deptCode}/item-types
  └─ 点击事项类型 → guideStore 写入 itemTypeCode/itemTypeName
/items?deptCode={code}&itemTypeCode={type}&page=1
  └─ GET /api/public/service-guide/items?deptCode=...&itemTypeCode=...&page=...&pageSize=10
  └─ 点击事项卡片
/items/{itemId}
  └─ GET /api/public/service-guide/items/{itemId}
  └─ POST /api/public/stats/click（静默，失败不阻断）
```

### 按主题查

```
/home
  └─ 点击「按主题查」
/topics
  └─ GET /api/public/service-guide/themes
/item-types?themeCode={code}
  └─ GET /api/public/service-guide/themes/{themeCode}/item-types
/items?themeCode={code}&itemTypeCode={type}&page=1
  └─ GET /api/public/service-guide/items?themeCode=...&itemTypeCode=...&page=...
/items/{itemId}
  └─ GET /api/public/service-guide/items/{itemId}
```

### 底部导航

| 操作 | 行为 |
|---|---|
| 首页 | `resetKioskSession()` → `/home` |
| 返回 | `router.back()`，保留列表页码等浏览态 |
| 重来 | `/home?reset=1` → 清理 guideStore + contentStore |
| 帮助 | `/help` |
| 90s 无操作 | `useIdleHome` → 清理状态并回首页 |

---

## 四、错误与空状态处理

| 场景 | UI 表现 |
|---|---|
| 加载中 | 「加载中...」 |
| 空部门 | 「暂无部门配置，请联系工作人员」 |
| 空主题 | 「暂无主题配置，请联系工作人员」 |
| 空事项列表 | 「暂无相关事项」 |
| 空字段（详情） | 「暂无相关信息」 |
| 404（事项不存在） | 独立「事项不存在」区块，无重试按钮 |
| 502/503/504 | `formatApiErrorMessage` 友好文案 + 重试按钮 |
| 网络失败 | 「网络连接失败，请检查网络后重试」+ 重试 |
| 非法路由参数 | `ContentRouteFallback`「参数无效」 |
| 接口失败 | 错误卡片，不白屏 |

防重复机制：

- `loadingLock`：阻止并发 API 请求
- `navigating`：阻止重复路由跳转
- 分页按钮在 `loading || navigating` 时 disabled
- 重试按钮在 `retrying` 时 disabled

---

## 五、事项详情 13 个顶层字段

按 `api-spec.md` 展示，不暴露后台字段、缓存键或共享平台参数：

1. `basicInfo.name` — 事项名称  
2. `basicInfo.deptName` — 主管部门  
3. `basicInfo.themeNames` — 所属主题  
4. `basicInfo.summary` — 事项摘要  
5. `acceptConditions` — 受理条件  
6. `materials` — 材料清单  
7. `processSteps` — 办理流程  
8. `locations` — 办理地点  
9. `workTime` — 办理时间  
10. `timeLimit` — 承诺时限  
11. `feeStandard` — 收费标准  
12. `legalBasis` — 法律依据  
13. `consultPhone` / `complaintPhone` — 咨询/投诉电话  
14. `relatedPolicies` — 关联政策  
15. `relatedFaqs` — 常见问题  

（basicInfo 内 4 项 + 其余 11 个顶层字段，共 13 个业务区块；电话分开展示于同一联系信息区。）

---

## 六、零键盘检查

| 检查项 | 结果 |
|---|---|
| `no-keyboard.spec.ts` 扫描全部 `src/**/*.vue` | ✅ 17 文件通过 |
| 无 `<input>` / `<textarea>` / `contenteditable` | ✅ |
| 办事指南全程点击导航 | ✅ |
| 未实现搜索输入框 | ✅ |
| 测试断言不调用 `/api/admin/*` 或外部 `http(s)://` | ✅ |

---

## 七、测试及构建结果

```bash
cd kiosk-app/tests && npm test -- --run
# Test Files  20 passed (20)
# Tests       113 passed (113)

cd kiosk-app && npm run build
# ✓ built in 3.42s

cd backend && npm test -- --runInBand
# Test Suites: 28 passed (6 skipped)
# Tests:       547 passed (35 skipped)

cd admin-web && npm test
# Test Files  23 passed (23)
# Tests       160 passed (160)
```

### 办事指南专项测试覆盖

| 用例 | 文件 |
|---|---|
| 按部门完整链路 | `serviceGuide.lifecycle.spec.ts` |
| 按主题完整链路 | `serviceGuide.lifecycle.spec.ts` |
| 空部门 / 空主题 | `serviceGuide.lifecycle.spec.ts` |
| 事项列表分页（1/3 → 2/3 → 3/3） | `serviceGuide.lifecycle.spec.ts` |
| 详情 13 字段区块 | `serviceGuide.lifecycle.spec.ts` |
| 空字段兜底「暂无相关信息」 | `serviceGuide.lifecycle.spec.ts` |
| 404 / 503 / 网络失败 | `serviceGuide.lifecycle.spec.ts` |
| 快速重复点击 | `serviceGuide.lifecycle.spec.ts` |
| 非法路由参数回退 | `serviceGuide.lifecycle.spec.ts` |
| 不请求 admin / 外部平台 | `serviceGuide.lifecycle.spec.ts` |
| guideStore 重来清理 | `serviceGuide.lifecycle.spec.ts` + `sessionReset.lifecycle.spec.ts` |
| 90s 超时清理 | `sessionReset.lifecycle.spec.ts` |
| 零键盘 | `no-keyboard.spec.ts` |

测试使用 `stubServiceGuideFetch` 明确标记的 mock 响应，**未写入硬编码业务数据到页面源码**。

---

## 八、远程访问验证

**群众端**：`http://10.217.19.22:5183`  
**后端**：`http://10.217.19.22:3100`

| 请求 | HTTP | 结果 |
|---|---|---|
| `GET /`（kiosk） | 200 | Vite 开发服务正常，SPA 壳加载 |
| `GET /api/public/service-guide/depts` | 200 | `data: []` — 部门配置表为空 |
| `GET /api/public/service-guide/themes` | 200 | `data: []` — 主题配置表为空 |
| `GET /api/public/service-guide/items?deptCode=D-001&itemTypeCode=query` | 200 body code=404 | 「部门 D-001 不存在」— 符合未配置预期 |
| `GET /api/public/service-guide/items/i-001` | 200 | 返回完整 mock 事项详情（development provider） |

远程验证结论：

- 接口层与 Step 12 验收一致，depts/themes 空数组符合 041 报告（未操作数据库）。
- 群众端在远程环境下应展示「暂无部门配置 / 暂无主题配置」，**不得**为联调而写入硬编码部门/主题。
- 事项详情接口可直接通过 `i-001` 等 mock ID 验证（需从首页模块或其他入口直达详情路由，或管理端后续配置部门/主题后走完整链路）。
- 本次未使用浏览器自动化对远程触摸屏做人工点击验收；HTTP 层验证通过。

---

## 九、未完成事项与风险

| 项 | 说明 | 风险等级 |
|---|---|---|
| 远程完整触摸链路 | 远程 depts/themes 均为 `[]`，无法在 5183 上走完「部门→类型→列表→详情」全路径 | 低 — 空态已覆盖；配置数据需管理端 Step 10/11 录入 |
| 列表接口与配置联动 | 未配置部门时 items 查询返回 404，页面会显示错误文案而非空列表 | 低 — 符合后端语义；配置补齐后自动正常 |
| 详情点击量统计 | `postClick` 为 fire-and-forget，失败不影响展示；测试中末次 fetch 可能为 stats 而非 detail | 无 — 已用 `mock.calls.some` 断言详情请求 |
| 真实共享平台 | 仍为 development mock provider，非生产对接 | 预期内 — Step 13 范围外 |
| AI / 预约 / 办件 / 打印 / 扫码 | 未实现 | 预期内 — 二期 |

---

## 十、验收结论

Step 13 **通过**：

1. 复用并增强 5 个办事指南页面，数据全部经 `/api/public/service-guide/*` 获取。  
2. 加载、空态、404、502/503/504、网络失败、防重复、分页、路由安全、字段兜底均已实现并有测试覆盖。  
3. 事项详情展示 api-spec 规定字段，不泄露后台/缓存/平台参数。  
4. 零键盘约束保持；首页/重来/90s 超时清理 guideStore。  
5. kiosk 测试 113/113、构建成功；backend / admin-web 测试无回归。  
6. 远程 HTTP 验证与 041 一致（空配置 + mock 详情可用），未修改数据库。
