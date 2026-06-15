# 036 · Step 10 GuideConfigModule Phase 2 验收收尾

**交付日期**：2026-06-15  
**基于**：035-step10-guide-item-config-backend.md  
**状态**：✅ 验收收尾完成（未进入管理端页面、群众端接口、共享平台对接）

---

## 一、035 中发现的问题

| # | 问题 | 影响 |
|---|---|---|
| 1 | `ItemConfigListQueryDto` 的 `deptCode`/`themeCode` 仅用 `@IsOptional()` + `@NormalizeGuideCode()`，未强制 `IsString`、禁止空白、限制长度，也未拒绝 null/数组/对象 | 列表筛选可能传入非法 query 参数 |
| 2 | 创建/更新 DTO 对 `relatedPolicyIds`/`relatedFaqIds` 使用 `@ArrayUnique()` | 与「重复 ID 自动去重、不因重复返回 400」约定冲突 |
| 3 | 更新 DTO 对关联 ID 使用双重 `@ValidateIf(... !== null)` | 误跳过 `null` 校验，导致 `relatedPolicyIds: null` 穿透到 service 而非 400 |
| 4 | `SeedGuideItemRolePermissions` 迁移测试未对齐 Phase 1 `SeedGuideRolePermissions` 的安全覆盖 | roleCode/status/固定 ID 占用/幂等跳过/down 安全等场景缺失 |
| 5 | `SeedGuideItemPermissions` 缺少「固定 ID 归属占用」up 路径测试 | 迁移 up 拒绝逻辑未单测覆盖 |
| 6 | 035 交付日期 2026-06-12 早于前置 034（2026-06-15） | 时间线不一致，**不修改 035 原文**，在本报告记录 |
| 7 | 035 声称迁移测试已完整覆盖角色授权安全策略，实际少于 Phase 1 同类测试 | 报告描述与代码覆盖存在偏差 |

---

## 二、实际修复内容

### 修改文件（仅限允许范围）

| 路径 | 变更 |
|---|---|
| `backend/src/guide-config/dto/item-config-list-query.dto.ts` | 筛选参数严格校验 |
| `backend/src/guide-config/dto/create-item-config.dto.ts` | 移除 `ArrayUnique` |
| `backend/src/guide-config/dto/update-item-config.dto.ts` | 移除 `ArrayUnique`；修正关联 ID null 拒绝逻辑 |
| `backend/test/guide-item-config.spec.ts` | 筛选、重复 ID、关联 ID 语义 HTTP 测试；测试 UUID 改为 v4 |
| `backend/test/related-ids.util.spec.ts` | 重复 ID 去重语义测试 |
| `backend/test/seed-guide-item-permissions-migration.spec.ts` | 固定 ID 归属占用 up 拒绝 |
| `backend/test/seed-guide-item-role-permissions-migration.spec.ts` | 6 项安全/幂等/down 测试 |
| `CLAUDE.md` | Phase 2 验收状态补充 |

**未修改**：迁移业务逻辑文件（`1749914400000`、`1749918000000`）行为已符合要求，仅补测试；`admin-web`、`kiosk-app`、实体、控制器、database-config 等。

---

## 三、列表筛选参数校验规则

`ItemConfigListQueryDto` 中 `deptCode`、`themeCode`：

| 语义 | 行为 |
|---|---|
| `undefined`（未传） | 跳过校验，不作为筛选条件 |
| 字符串 | 必须为非空（trim 后）、`trim + uppercase`、最大长度 50 |
| `null` | 400（`ValidateIf !== undefined` 后 `IsString` 失败） |
| 数组 / 对象 | 400（`IsString` 失败） |
| 纯空白 / 空字符串 | 400（`IsNotBlankString`） |
| 超长（>50） | 400（`MaxLength(50)`） |

规范化后的值直接传入 `ItemConfigService.list()` → repository `where` 条件。

---

## 四、重复关联 ID 的最终处理规则

| 环节 | 规则 |
|---|---|
| DTO 校验 | **不使用** `ArrayUnique`；合法 UUID v4 数组元素允许重复 |
| 创建 | `serializeRelatedIds()` 去重 → 字典序排序 → JSON 存 text；空数组 → `null` |
| 更新 `undefined` | 不修改原值 |
| 更新 `null` | **拒绝 400**（`IsArray` 校验 null） |
| 更新 `[]` | 清空，存储 `null` |
| 响应 | `normalizeRelatedIdsForResponse()` 还原为去重排序后的 `string[]` |

---

## 五、关联 ID 格式约束

核对结论：**可继续使用 `IsUUID('4')`**。

依据：

- `docs/database.md`：业务主键 `varchar(36)`，后端 UUID 生成
- `BaseBusinessEntity`、`BaseRelationEntity`、`ContentVersion` 等均通过 `uuid` 包 `v4()` 生成 ID
- Content、Publish 模块 DTO 已统一使用 `IsUUID('4')`

因此 `relatedPolicyIds`/`relatedFaqIds` 元素须为 **UUID v4**，这是与现有内容主键一致的业务约束，而非任意 36 字符字符串。测试常量已改为合法 v4 格式（如 `11111111-1111-4111-8111-...`）。

暂未实现跨模块校验 ID 是否存在于 `content_item`（本阶段范围外）。

---

## 六、实际新增测试场景

| 文件 | 新增 | 场景 |
|---|---|---|
| `guide-item-config.spec.ts` | +11 | 筛选规范化/空串/超长/数组/对象 400；重复 ID 创建/更新成功；空数组存 null；update null 拒绝；undefined 不修改 |
| `related-ids.util.spec.ts` | +1 | 重复 ID 由序列化层去重 |
| `seed-guide-item-permissions-migration.spec.ts` | +1 | 固定权限 ID 归属占用 up 拒绝 |
| `seed-guide-item-role-permissions-migration.spec.ts` | +6 | roleCode 不匹配；status disabled；固定 ID 占用；同 pair 幂等跳过；down 不删外来关联；down 归属篡改拒绝 |

**本收尾净增后端测试 19 项**（478 → 497 passed）。

---

## 七、完整验证结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run type-check` | ✅ |
| `cd backend && npm run build` | ✅ |
| `cd backend && npm test -- --runInBand` | ✅ **497 passed**, 35 skipped |
| `cd admin-web && npm run type-check && npm run build && npm test -- --run` | ✅ 129 passed |
| `cd kiosk-app && npm run build && npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ |
| `cd kiosk-app/tests && npm test -- --run` | ✅ 91 passed |

原有 GuideConfig、Content、Publish、Auth 等套件无回归。

---

## 八、数据库连接说明

**未连接或修改实际数据库。**

---

## 九、035 遗留记录（不改写 035）

- **日期错误**：035 标注 2026-06-12，前置 034 为 2026-06-15；以本报告日期 2026-06-15 为准
- **迁移测试描述偏差**：035 称角色授权迁移测试已覆盖完整安全策略，实际缺少 roleCode/status/固定 ID 占用/幂等跳过/down 外来保护等 6 项，本次已补齐

---

## 十、尚未实现的后续功能

- admin-web 事项配置管理页面
- `/api/public/service-guide/*` 群众端接口
- ServiceGuideModule 共享平台真实调用与同步
- `guide_api_cache`
- 关联 ID 跨模块存在性校验
- 实际数据库迁移执行

---

## 十一、停止边界

Phase 2 管理端后端验收收尾已完成，按要求停止，不进入下一阶段。
