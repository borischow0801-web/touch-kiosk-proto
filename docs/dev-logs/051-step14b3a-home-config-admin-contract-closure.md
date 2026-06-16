# 051 · Step 14B-3A 首页配置 Admin API 契约收口

**交付日期**：2026-06-16  
**基于**：050-step14b3-home-config-admin-crud.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

在 Step 14B-3 草稿与模块 CRUD 基础上，收口 Admin API 契约：

1. `isVisible` 请求/响应统一为 **boolean**，数据库仍存 **smallint**（1/0）
2. 模块排序补充 **id / sortOrder 重复**校验（400）
3. 补充 Service 与 HTTP 层测试

**未实现**：PublishService `home_config` 适配器、Public Home API 真实查询、admin-web / kiosk-app 改造。

**未修改**：admin-web、kiosk-app、deploy、`docs/database.md`、`docs/architecture.md`、`docs/api-spec.md`、`CLAUDE.md`、Entity、Migration、环境配置。

**未连接或操作**任何数据库。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `backend/src/home-config/dto/create-home-module.dto.ts` | `isVisible`：`@IsBoolean()`，可选 |
| `backend/src/home-config/dto/update-home-module.dto.ts` | `isVisible`：`@IsBoolean()`，可选 |
| `backend/src/home-config/home-config.service.ts` | boolean↔smallint 映射；sort 重复校验 |
| `backend/test/home-config.service.spec.ts` | 新增 5 用例（18 总计） |
| `backend/test/admin-home-config.spec.ts` | 新增 3 用例（13 总计） |
| `docs/dev-logs/051-step14b3a-home-config-admin-contract-closure.md` | 本报告 |

`sort-home-modules.dto.ts` 无需改动：重复校验在 Service 层完成，DTO 仍保留 `ArrayMinSize(1)` 等既有规则。

---

## 三、isVisible boolean 契约修复说明

### 问题

Step 14B-3 初版 DTO 使用 `@IsInt() @IsIn([0, 1])`，与 `docs/api-spec.md` §十 不一致——规范要求 POST/PUT 模块接口接收 **boolean**，响应也返回 **boolean**。

### 修复

| 层级 | 行为 |
|---|---|
| **CreateHomeModuleDto** | `isVisible?: boolean`，`@IsBoolean()` |
| **UpdateHomeModuleDto** | `isVisible?: boolean`，`@IsBoolean()` |
| **HTTP 入参** | 前端传 `true` / `false`，不再要求 `0` / `1` |
| **HTTP 响应** | `toModuleListItem` 仍返回 `isVisible: module.isVisible === 1` |

ValidationPipe 会在 Controller 调用 Service 前拒绝非 boolean 值（如 `0`、`1`、字符串），保证契约一致。

---

## 四、smallint 映射说明

Entity / Migration **未改**，映射仅在 Service 私有方法完成：

```typescript
private toIsVisibleSmallint(value: boolean | undefined, defaultVisible = true): number {
  if (value === undefined) {
    return defaultVisible ? 1 : 0;
  }
  return value ? 1 : 0;
}
```

| 操作 | 调用 | 存储 |
|---|---|---|
| 创建模块 | `toIsVisibleSmallint(dto.isVisible, true)` | `true→1`，`false→0`，未传→默认 `1` |
| 更新模块 | `toIsVisibleSmallint(dto.isVisible)` | 仅当 DTO 含 `isVisible` 时写入 |
| 读取响应 | `module.isVisible === 1` | 始终返回 boolean |

---

## 五、sort 校验说明

`sortModules` 在事务开始前校验 `dto.items`：

| 规则 | 违反时 |
|---|---|
| `items` 不得为空 | DTO `@ArrayMinSize(1)` → 400（既有） |
| `items[].id` 不得重复 | `BadRequestException('items 中存在重复的模块 id')` → 400 |
| `items[].sortOrder` 不得重复 | `BadRequestException('items 中存在重复的 sortOrder')` → 400 |
| `sortOrder` 从 1 起 | DTO `@Min(1)`（既有） |
| id 不属于当前 draft 或已逻辑删除 | `NotFoundException` → 404（既有） |

重复检测使用 `Set` 比较数组长度，在数据库查询之前失败，避免无效事务。

---

## 六、测试结果

```bash
git diff --check          # 通过（无 trailing whitespace 冲突）
cd backend && npm test -- --runInBand
# Test Suites: 33 passed
# Tests:       621 passed
```

### 新增 Service 测试（5）

- 创建模块 `isVisible: true` → 存 1，响应 boolean `true`
- 创建模块 `isVisible: false` → 存 0，响应 boolean `false`
- 更新模块 `isVisible: false` → 存 0
- sort 重复 id → 400
- sort 重复 sortOrder → 400

### 新增 HTTP 测试（3）

- POST `/api/admin/home/modules` + `isVisible: true` → 201，`createModule` 收到 boolean
- POST + `isVisible: false` → 201
- PUT `/api/admin/home/modules/:id` + `isVisible: false` → 200

### 未退化测试

- 401 / 403 权限校验
- `PUT /modules/sort` 路由顺序（不被 `:id` 捕获）
- 其余 Step 14B-3 用例全部通过

---

## 七、声明

- **未修改** admin-web、kiosk-app、deploy、基线文档（`database.md` / `architecture.md` / `api-spec.md` / `CLAUDE.md`）、Entity、Migration、环境配置
- **未连接或操作**任何数据库；全部测试使用内存 mock Repository / mock Service

---

## 八、下一步建议

**Step 14B-4**：实现 `home_config` 发布适配器

- `HomeConfigPublishService`（draft → pending → published 状态流转）
- 注册至 `PublishService` 的 `home_config` 内容类型
- 发布时写入 `publish_record`、更新 `currentVersionId`
- 随后可衔接 Public Home API 真实组合查询（非本阶段范围）
