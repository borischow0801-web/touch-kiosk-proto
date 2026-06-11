# 003 · Step 1 API 安全与对齐修复

**日期**：2026-06-11  
**分支**：main  
**目标**：修复 002 交付后经 review-rules.md 审查发现的接口规范、安全隐私和前端一致性问题。

---

## 1. 002 交付报告勘误

dev-log 002 中写道：

> ServiceGuideModule 的数据服务方法签名（`getDepts/getTopics/getItems/getItemDetail`）已按照最终接口规范设计，Step 2 只需替换实现体，控制器层不需改动。

此描述不实。实际情况：

- 002 交付时服务方法使用 `id`/`deptId`/`topicId` 字段，与 api-spec.md 规定的 `deptCode`/`themeCode` 不符
- 控制器缺少 `depts/:deptCode/item-types` 和 `themes/:themeCode/item-types` 两个路由
- 事项列表未实现分页
- 事项详情未实现规定的 DTO 结构（`basicInfo`、`acceptConditions` 等 13 个字段）
- 统计接口接受任意字段 `Record<string, unknown>`，存在敏感信息采集风险

本次交付全部修正。

---

## 2. 修改文件清单

### 后端（backend/）

| 文件 | 类型 | 变更描述 |
|---|---|---|
| `src/stats/dto/click-event.dto.ts` | 新增 | 点击事件白名单 DTO，只允许 type/id/ts |
| `src/stats/dto/page-view.dto.ts` | 新增 | 页面访问白名单 DTO，只允许 path/ts |
| `src/service-guide/dto/items-query.dto.ts` | 新增 | 事项列表查询 DTO（deptCode/themeCode/itemTypeCode + 继承分页） |
| `src/stats/stats.service.ts` | 修改 | 只记录 DTO 字段，拆分 recordClick/recordPageView |
| `src/public-api/controllers/stats.controller.ts` | 修改 | 使用 DTO 接收参数，新增 POST /page-view |
| `src/service-guide/service-guide.service.ts` | 重写 | 对齐 api-spec：deptCode/themeCode、getItemTypes、分页、结构化 DTO |
| `src/public-api/controllers/service-guide.controller.ts` | 重写 | 新增 item-types 路由，改用 ItemsQueryDto |
| `src/main.ts` | 修改 | CORS 从 CORS_ORIGIN 环境变量读取，禁用 X-Powered-By |

### 群众端（kiosk-app/）

| 文件 | 类型 | 变更描述 |
|---|---|---|
| `src/stores/guide.ts` | 新增 | Pinia 会话状态 store，`$reset()` 用于明确清理 |
| `src/api/client.ts` | 修改 | 非 2xx 时优先解析信封 message，再回落通用提示 |
| `src/api/types.ts` | 重写 | 对齐新 DTO：deptCode/themeCode/ItemType/结构化 ItemDetail |
| `src/api/endpoints.ts` | 重写 | 新接口路径，buildQuery 辅助函数，postPageView |
| `src/app/useIdleHome.ts` | 修改 | 新增 onReset 可选回调参数 |
| `src/App.vue` | 修改 | watch route 处理 reset=1，调用 guideStore.$reset()，传 onReset 给 useIdleHome |
| `src/app/router.ts` | 修改 | 新增 /item-types 路由，params 改用 :itemId |
| `src/pages/Home.vue` | 修改 | 更新导航文案，修复 router.push void |
| `src/pages/DeptList.vue` | 重写 | 使用 deptCode，设置 guideStore，导航至 item-types |
| `src/pages/TopicList.vue` | 重写 | 使用 themeCode，导航至 item-types |
| `src/pages/ItemTypeList.vue` | 新增 | 事项类型选择页，支持 dept/theme 两种来源 |
| `src/pages/ItemList.vue` | 重写 | 使用新参数，分页（上一页/下一页），面包屑 |
| `src/pages/ItemDetail.vue` | 重写 | 展示全部 13 个规定字段，空值显示"暂无相关信息" |

---

## 3. 接口变化汇总

### 新增接口

| 接口 | 说明 |
|---|---|
| `GET /api/public/service-guide/depts/:deptCode/item-types` | 按部门获取事项类型 |
| `GET /api/public/service-guide/themes/:themeCode/item-types` | 按主题获取事项类型 |
| `POST /api/public/stats/page-view` | 页面访问上报 |

### 变更接口

| 接口 | 变更 |
|---|---|
| `GET /api/public/service-guide/depts` | 响应字段 `id` → `deptCode` |
| `GET /api/public/service-guide/themes` | 响应字段 `id` → `themeCode` |
| `GET /api/public/service-guide/items` | 查询参数 `deptId/topicId` → `deptCode/themeCode`，新增 `itemTypeCode`，响应改为分页结构 |
| `GET /api/public/service-guide/items/:itemId` | 响应结构改为 13 字段规范 DTO |
| `POST /api/public/stats/click` | 由 `Record<string,unknown>` 改为白名单 DTO |

---

## 4. 验证命令与结果

### 构建与类型检查

```
backend   npm run type-check  ✅
backend   npm run build       ✅
kiosk-app npm run build       ✅  53 模块，109.29 kB
admin-web npm run type-check  ✅
admin-web npm run build       ✅
```

### 接口烟测

```
GET  /api/public/service-guide/depts                   → code:0, deptCode 字段存在 ✅
GET  /api/public/service-guide/depts/d-001/item-types  → code:0, [apply,query,cert] ✅
GET  /api/public/service-guide/depts/BADCODE/item-types → code:404 ✅
GET  /api/public/service-guide/themes/t-001/item-types  → code:0, [apply,query,cert] ✅
GET  /api/public/service-guide/items?page=1&pageSize=3  → total:6, list_len:3 ✅ 分页正常
GET  /api/public/service-guide/items?deptCode=d-001&itemTypeCode=query → total:1 ✅ 过滤正常
GET  /api/public/service-guide/items?page=0            → code:400 ✅ 非法参数拒绝
GET  /api/public/service-guide/items?pageSize=999       → code:400 ✅ 超范围拒绝
GET  /api/public/service-guide/items/i-001             → 13字段全部存在，basicInfo.deptName='人社局' ✅
GET  /api/public/service-guide/items/NOTEXIST          → code:404 ✅
POST /api/public/stats/click {type:item_view,id:i-001}  → code:0 ✅
POST /api/public/stats/click {type:INVALID_TYPE}        → code:400 ✅ 类型白名单生效
POST /api/public/stats/click {type:item_view,idCard:...,mobile:...,name:...} → code:0，敏感字段被 whitelist 自动剥离 ✅
POST /api/public/stats/page-view {path:/items/i-001}    → code:0 ✅
POST /api/public/stats/page-view {}                     → code:400 ✅ 缺少 path 字段
```

### 日志安全验证

```
StatsService 只记录 {event, type, id} / {event, path}
idCard / mobile / name 等字段在 ValidationPipe whitelist 阶段剥离，不进入 Service，不出现在日志
```

### kiosk-app 安全检查

```
无 <input> 可聚焦元素           ✅
无 /api/admin 调用              ✅
无共享平台直接调用              ✅
无旧 /api/ 非 public 路径       ✅
重置机制（guideStore.$reset）   ✅ 在 App.vue watch + useIdleHome onReset 中均调用
```

---

## 5. 安全加固说明

| 风险点 | 修复方式 |
|---|---|
| 统计接口接受任意字段（含敏感信息） | ClickEventDto / PageViewDto 白名单 + `whitelist: true` ValidationPipe 自动剥离 |
| 日志记录原始请求体 | StatsService 改为只记录 DTO 中的业务字段 |
| 过度开放的 CORS | CORS origin 改从 `CORS_ORIGIN` 环境变量读取，默认 `*` 仅用于开发 |
| X-Powered-By 泄露服务器信息 | `expressApp.disable('x-powered-by')` 始终禁用 |
| 非 2xx 时错误信息不友好 | client.ts 优先解析信封 `message` 字段，再回落通用提示 |

---

## 6. 未完成事项

| 事项 | 说明 |
|---|---|
| 统计接口未落库 | 当前 StatsService 只打日志，Step 2（TypeORM）后接入 stat_click_event/stat_page_view 表 |
| CORS 生产配置 | 部署时必须设置 `CORS_ORIGIN` 环境变量，否则仍为 `*` |
| 事项详情 mock 中部分字段为空 | `legalBasis`、`relatedPolicies`、`relatedFaqs` 为空数组，Step 2 接入共享平台后填充 |
| admin-web 页面未建设 | 将在 Step 3+ 推进 |

---

## 7. 风险点

- mock 数据的 `deptCode`/`themeCode`（`d-001`～`d-004`）是占位值，Step 2 需对应真实平台编码，届时需同步更新前端配置
- `CORS_ORIGIN=*` 仅适用于开发和 Android APK（APK 不受浏览器 CORS 限制），Web 测试环境需配置具体域名
