# 039 · Step 12 办事指南公共接口与缓存机制验收修复

**交付日期**：2026-06-15  
**基于**：038-step12-service-guide-public-cache-foundation.md  
**状态**：✅ 代码与测试验收修复完成；HTTP 冒烟受开发库缺表阻断

---

## 一、审查发现与修复项

| # | 问题 | 修复 |
|---|---|---|
| 1 | 上游成功后缓存写入失败会导致请求失败 | `trySaveSuccess` 吞掉写入异常，仍返回上游最新数据 |
| 2 | 缓存读取 DB 异常可能泄露原始错误 | `readFallbackCache` 捕获 DB 异常，记安全日志，按无缓存处理 |
| 3 | 并发首次写入 `cache_key` 唯一键竞争 | 捕获 1062/23505 后重试 update 路径 |
| 4 | `cache_key` 随参数 JSON 变长 | 改为 `apiName:sha256(sortedParams)` 固定 64 位摘要 |
| 5 | 缓存 JSON 可解析但结构不符仍被使用 | 新增 `guide-cache-response.validator.ts` 按 API 校验 |
| 6 | `is_visible=0` 事项仍出现在列表/详情 | `filterPublicItems` / `requirePublicItem` 统一规则 |
| 7 | production 默认 development mock | `NODE_ENV=production` 必须显式配置且禁止 development |
| 8 | `RealServiceGuideProvider` 注册为 Nest provider 导致启动 DI 失败 | 从 `ServiceGuideModule` providers 移除，仅 Factory `new` 实例化 |

---

## 二、实际修改文件

| 路径 | 说明 |
|---|---|
| `backend/src/service-guide/cache/guide-cache.service.ts` | 写入容错、读库容错、唯一键竞争、结构校验 |
| `backend/src/service-guide/cache/guide-cache-key.util.ts` | SHA-256 固定长度 cache_key |
| `backend/src/service-guide/cache/guide-cache-response.validator.ts` | **新增** 缓存响应结构校验 |
| `backend/src/service-guide/providers/service-guide-provider.factory.ts` | production 环境安全 |
| `backend/src/service-guide/public-guide-config.service.ts` | 事项可见性判定与过滤 |
| `backend/src/service-guide/service-guide.service.ts` | 列表过滤、详情前置校验 |
| `backend/src/service-guide/service-guide.module.ts` | 移除 Provider 类 DI 注册 |
| `backend/.env.example` | Service Guide 环境变量与 production 限制说明 |
| `backend/test/service-guide-public.spec.ts` | 缓存/可见性新增用例 |
| `backend/test/service-guide-provider.factory.spec.ts` | production 安全用例 |
| `backend/test/guide-cache-key.util.spec.ts` | 摘要键用例 |

**未修改**：`admin-web/**`、`kiosk-app/**`、数据库、迁移执行、实际 `.env`。

---

## 三、关键行为说明

### 3.1 GuideCacheService

- **成功路径**：`fetcher` → `trySaveSuccess`（失败仅 `write_failed` 日志）→ 返回最新数据。
- **失败路径**：读 fallback → 校验 JSON + API 结构 → 返回；读库失败/损坏/无缓存 → 503。
- **404**：`NotFoundException` 直接抛出，不走缓存。
- **日志**：仅 `api`、`result`、`durationMs`、`requestId`；不记录完整参数/响应/凭据。

### 3.2 cache_key 规则

```
cache_key = `${apiName}:${sha256(utf8(JSON.stringify(sortedParams)))}`
request_param = JSON.stringify(sortedParams)   // 完整参数，text 存储
```

### 3.3 事项可见性（保守策略）

| 配置状态 | 群众端列表 | 群众端详情 |
|---|---|---|
| `guide_item_config` 存在且 `is_visible=1` | 可见 | 可见（再走上游+缓存） |
| `guide_item_config` 存在且 `is_visible=0` | **不可见** | **404** |
| 无配置 + `development` mock 环境 | mock 目录中的示例事项可见 | 同上 |
| 无配置 + 非 mock（生产 real） | **不可见**（保守，需管理端配置后才展示） | **404** |

列表与详情使用同一 `isItemPubliclyVisible` / `requirePublicItem` 逻辑，保证一致。

### 3.4 Provider 环境安全

| NODE_ENV | SERVICE_GUIDE_PROVIDER 未设置 | `development` | `real` + BASE_URL |
|---|---|---|---|
| development / test | 默认 mock | 允许 | 允许（运行时仍拒绝猜协议） |
| production | **启动失败** | **启动失败** | 允许（需 BASE_URL） |

---

## 四、测试结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run type-check` | ✅ 通过 |
| `cd backend && npm run build` | ✅ 通过 |
| `cd backend && npm test -- --runInBand` | ✅ **540 passed**，35 skipped |
| `cd admin-web && npm test -- --run` | ✅ 160 passed |
| `cd admin-web && npm run build` | ✅ 通过 |
| `cd kiosk-app/tests && npm test -- --run` | ✅ 91 passed |
| `cd kiosk-app && npm run build` | ✅ 通过 |

### 本步新增/更新测试（+11）

| 文件 | 新增用例要点 |
|---|---|
| `service-guide-public.spec.ts` | 写缓存失败仍返回、读库 503、唯一键竞争、结构损坏、可见性列表/详情 |
| `service-guide-provider.factory.spec.ts` | production 缺配置/禁止 development |
| `guide-cache-key.util.spec.ts` | SHA-256 固定长度、摘要不包含明文参数 |

---

## 五、HTTP 冒烟验证（实际运行）

**启动**：已有 `npm run dev` 进程在修复后热重载成功。

```
[Nest] Bootstrap Backend running on http://0.0.0.0:3100
ss: LISTEN 0.0.0.0:3100  ✅
```

| 接口 | HTTP | 实际响应摘要 |
|---|---|---|
| `GET /api/public/service-guide/depts` | **500** | `Table 'touch_kiosk_dev.guide_dept_mapping' doesn't exist` |
| `GET /api/public/service-guide/themes` | **500** | `guide_theme_mapping` 表不存在 |
| `GET /api/public/service-guide/items?page=1&pageSize=5` | **500** | `guide_item_config` 表不存在（可见性过滤查询） |
| `GET /api/public/service-guide/items/i-001` | **500** | `guide_item_config` 表不存在（`requirePublicItem` 查询） |

### 阻断条件（如实记录）

- 连接的是本机 `touch_kiosk_dev`（`.env` 已配置），**guide 相关表尚未迁移创建**（`guide_dept_mapping`、`guide_theme_mapping`、`guide_item_config`、`guide_api_cache`）。
- 本任务**禁止**执行 migration/建库，故无法在真实 DB 上完成端到端 HTTP 成功验证。
- 服务进程、路由注册、Provider 初始化（development mock）、`0.0.0.0:3100` 监听均已确认；业务成功路径由 **540 项单元/集成测试**（含 mock Repository）覆盖。

---

## 六、数据库与外部依赖

- **未**连接或修改 `oms_db` 及其他项目库。
- **未**执行 migration、seed、建库或授权。
- **未**实现真实共享平台对接（仍无正式接口文档）。

---

## 七、未完成事项与风险

| 项 | 说明 |
|---|---|
| 开发库缺 guide 表 | 运维执行项目迁移后 HTTP 冒烟方可返回 200；depts/themes 依赖配置数据，空表时即使 200 也返回 `[]` |
| 列表 total 调整 | 按页隐藏事项时 `total` 仅扣减当前页隐藏数，跨页精确 total 需上游或全量配置协同（已知近似） |
| production real Provider | 仍无正式协议实现，配置 `real` 后调用会明确失败 |
| 远程 10.217.19.22:3100 | 本机验证未覆盖远程节点；需部署+迁移后复测 |

---

**验收修复代码与测试已完成。HTTP 业务成功链路因开发库缺表未能在本环境实测通过，不得声称已完成线上冒烟。**
