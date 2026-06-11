# 005 · Step 1 最终安全闭环

> 修复 004 交付的遗留安全问题，完成 Step 1 的全部安全收尾。

---

## 修改文件清单

| 文件 | 修改内容 |
|---|---|
| `backend/src/service-guide/service-guide.service.ts` | 新增 4 个 lookup 方法：`existsItemId`, `existsDeptCode`, `existsThemeCode`, `existsItemTypeCode` |
| `backend/src/public-api/controllers/stats.controller.ts` | 注入 `ServiceGuideService`；新增 `validateClick` / `validatePagePath` 语义校验；校验失败时抛 `BadRequestException`，不调用 `StatsService` |
| `backend/src/stats/dto/click-event.dto.ts` | 移除 `@Matches` 正则（语义校验已移至控制器）；保留 `@IsString()` `@MaxLength(100)` |
| `backend/src/stats/dto/page-view.dto.ts` | 移除 `@Matches` 正则（路由白名单校验已移至控制器）；保留 `@IsString()` `@MaxLength(200)` |
| `backend/package.json` | 新增 `test` 脚本；新增测试 dev 依赖（jest, ts-jest, supertest, @nestjs/testing, @types/*） |
| `backend/jest.config.js` | 新建 Jest 配置文件 |
| `backend/test/stats.spec.ts` | 新建：35 条自动化测试 |
| `deploy/docker-compose.yml` | 移除硬编码 `http://localhost`；改用 `${CORS_ORIGIN:?...}` 变量替换，不设值时 compose 拒绝启动；新增 `NODE_ENV=production` |
| `deploy/.env.example` | 新建部署配置示例，不含真实域名和凭据 |

---

## 架构决策

**语义校验放在 `StatsController`（`PublicApiModule`）而非 `StatsModule`：**

- `PublicApiModule` 已同时 import `ServiceGuideModule` 和 `StatsModule`
- 控制器是自然的"编排层"，负责协调两个模块
- `StatsService` 保持纯日志职责，不承载业务数据依赖
- `StatsModule` 不 import `ServiceGuideModule`，模块边界未变

**click 事件语义规则：**

| click type | id 要求 |
|---|---|
| `item_view`, `hot_item_click` | 必须是 `ServiceGuideService` 中存在的 `itemId` |
| `dept_click` | 必须是存在的 `deptCode` |
| `theme_click` | 必须是存在的 `themeCode` |
| `type_click` | 必须是存在的 `itemTypeCode` |
| `module_click` | 必须在固定白名单：`service-guide`, `navigation`, `notice`, `policy`, `showcase`, `faq`, `hot-items`, `help` |
| `nav_click` | 必须在固定白名单：`home`, `back`, `reset`, `help` |

**page-view 路由白名单：**

- 静态路径：`/home`, `/depts`, `/topics`, `/item-types`, `/items`, `/help`
- 动态路径：`/items/:itemId`，其中 `itemId` 必须存在于 `ServiceGuideService`，字符集限 `[a-zA-Z0-9\-_]`，长度 ≤ 60

---

## 验证结果

### 构建 / 类型检查

| 项目 | 命令 | 结果 |
|---|---|---|
| backend | `npm run type-check` | ✅ 通过（0 错误） |
| backend | `npm run build` | ✅ 通过 |
| kiosk-app | `npm run build` | ✅ 通过（53 modules, 109.79 kB） |
| admin-web | `npm run type-check` | ✅ 通过（0 错误） |
| admin-web | `npm run build` | ✅ 通过 |

### 自动化测试

```
Tests: 35 passed, 35 total
Test Suites: 1 passed, 1 total
```

**click 合法用例（8 条）：** item_view/hot_item_click/dept_click/theme_click/type_click/module_click/nav_click 均返回 code 0，StatsService 被调用。

**click 非法用例（11 条）：**

| 输入 | 预期 | 实际 |
|---|---|---|
| item_view + `i-999`（不存在） | 400 | ✅ 400 |
| item_view + `13800138000`（手机号） | 400 | ✅ 400 |
| item_view + `110101199001011234`（18位身份证） | 400 | ✅ 400 |
| item_view + `110101900101123`（15位身份证） | 400 | ✅ 400 |
| dept_click + `i-001`（类型错误） | 400 | ✅ 400 |
| theme_click + `d-001`（类型错误） | 400 | ✅ 400 |
| type_click + 不存在的类型 | 400 | ✅ 400 |
| module_click + 不在白名单的代码 | 400 | ✅ 400 |
| nav_click + 不在白名单的代码 | 400 | ✅ 400 |
| item_view 缺少 id | 400 | ✅ 400 |
| 携带多余字段 extra | 400 | ✅ 400 |

所有无效 click 请求：StatsService.recordClick **未被调用**。

**page-view 合法用例（8 条）：** `/home` `/depts` `/topics` `/item-types` `/items` `/help` `/items/i-001` `/items/i-006` 均返回 code 0，StatsService 被调用。

**page-view 非法用例（8 条）：**

| 输入 | 预期 | 实际 |
|---|---|---|
| `/13800138000` | 400 | ✅ 400 |
| `/unknown-route` | 400 | ✅ 400 |
| `/items/nonexistent-id` | 400 | ✅ 400 |
| `/home?reset=1` | 400 | ✅ 400 |
| `/home#section` | 400 | ✅ 400 |
| `http://evil.com` | 400 | ✅ 400 |
| `//evil.com` | 400 | ✅ 400 |
| 携带多余字段 extra | 400 | ✅ 400 |

所有无效 page-view 请求：StatsService.recordPageView **未被调用**。

### 日志安全验证（live 测试）

| 请求 | 日志输出 |
|---|---|
| item_view + `13800138000` | 无日志（BadRequestException，400 直接返回） |
| item_view + 身份证 | 无日志 |
| item_view + `i-003`（合法） | `{"event":"click","type":"item_view","id":"i-003"}` |
| dept_click + `d-002`（合法） | `{"event":"click","type":"dept_click","id":"d-002"}` |
| page-view + `/items/i-001` | `{"event":"page_view","path":"/items/i-001"}` |

**结论：日志只包含经过语义校验的业务 ID，手机号和身份证号不出现在日志中。**

### 生产 CORS 验证

| 场景 | 行为 |
|---|---|
| `NODE_ENV=production` 无 `CORS_ORIGIN` | 后端打印错误日志后 `process.exit(1)`，拒绝启动 ✅ |
| docker-compose 无 `CORS_ORIGIN` env var | `${CORS_ORIGIN:?...}` 变量替换使 compose 拒绝启动 ✅ |
| docker-compose.yml | 不含硬编码域名或 localhost ✅ |

---

## 遗留风险与说明

1. **`module_click` 白名单与 Step 2 数据库对齐**：`module_click` 的 8 个模块代码（`service-guide` 等）是基于当前 kiosk-app 路由硬编码的。Step 2 接入数据库后，若首页模块的 `code` 字段值变动，需同步更新控制器白名单。
2. **`nav_click` 白名单与 home-config 耦合**：`home`/`back`/`reset`/`help` 是当前导航栏的 4 个固定按钮，Step 2 不需要修改。
3. **mock 阶段事项 ID 固定**：`existsItemId` 等查询基于 mock 数据，Step 2 切换数据库后需替换为 DB 查询（接口不变，实现替换）。
4. **`supertest` force exit 提示**：测试运行时有 `Force exiting Jest` 提示（异步操作检测），使用 `--forceExit` 标志处理，不影响测试正确性。后续可改用 `--detectOpenHandles` 诊断根本原因。
