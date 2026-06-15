# 034 · Step 10 GuideConfigModule Phase 1 最终验收收尾

**交付日期**：2026-06-15  
**基于**：033-step10-guide-config-integrity-closure.md  
**状态**：✅ 完成（未进入 guide_item_config、共享平台、群众端或管理端页面）

---

## 一、修改文件

### 新增

- `backend/src/guide-config/utils/normalize-guide-code.util.ts`
- `backend/src/guide-config/dto/normalize-guide-code.transform.ts`
- `backend/test/normalize-guide-code.util.spec.ts`

### 修改

- `backend/src/guide-config/dept-mapping.service.ts`
- `backend/src/guide-config/theme-mapping.service.ts`
- `backend/src/guide-config/dto/create-dept-mapping.dto.ts`
- `backend/src/guide-config/dto/create-theme-mapping.dto.ts`
- `backend/src/guide-config/dto/update-dept-mapping.dto.ts`
- `backend/src/guide-config/dto/update-theme-mapping.dto.ts`
- `backend/src/database/migrations/1749898800000-SeedGuidePermissions.ts`
- `backend/src/database/migrations/1749902400000-SeedGuideRolePermissions.ts`
- `backend/test/guide-config.spec.ts`
- `backend/test/seed-guide-permissions-migration.spec.ts`
- `backend/test/seed-guide-role-permissions-migration.spec.ts`
- `CLAUDE.md`

### 未修改

- `admin-web/**`、`kiosk-app/**`、`deploy/**`、端口、`backend/.env`、实际数据库

---

## 二、编码规范化规则

集中实现于 `normalizeGuideCode(code)`：

```
trim() → toUpperCase()
```

| 环节 | 行为 |
|---|---|
| 创建 DTO | `@NormalizeGuideCode()` 在 ValidationPipe transform 阶段规范化 |
| 服务层写入/查重 | `create()` 再次调用 `normalizeGuideCode()`，与 DTO 结果一致 |
| 存储值 | 数据库保存大写编码（如 `CODE_A`） |
| 唯一性 | 查重与 DB 唯一索引均使用规范化后编码；`code_a` 与 `CODE_A` 视为冲突 |

MySQL 8 与 HighGo 在应用层统一大写后，大小写编码冲突行为一致，不依赖数据库排序规则差异。

---

## 三、nullable 字段语义（更新 DTO）

使用 `@ValidateIf((_, v) => v !== undefined)` 替代 `@IsOptional()`，区分：

| 语义 | 处理 |
|---|---|
| `undefined` | 字段未提交，跳过校验 |
| `null` | 对必填更新字段拒绝（400） |

### 不允许 null（传 null → 400）

- `deptName`、`displayName`、`status`、`isVisible`、`sortOrder`
- `themeName`、`isVisible`、`sortOrder`

### 允许 null 清空

| 字段 | 语义 |
|---|---|
| `icon` | 显式 `null` 清空图标 |
| `floorText` | 显式 `null` 清空楼层文案 |
| `areaText` | 显式 `null` 清空区域文案 |
| `platformParamJson` | 显式 `null` 清空共享平台参数 |

服务层对 `!== undefined` 字段赋值，支持 `null` 写入，不依赖数据库非空约束产生 500。

---

## 四、迁移安全规则

### SeedGuidePermissions `down()`

删除固定权限前，对每条记录调用 `guidePermissionMatchesSeed()` 校验全部归属字段：

- `permissionCode`、`permissionName`、`moduleCode`、`permissionType`、`sortOrder`

任一不一致 → 拒绝回滚，不删除。

### SeedGuideRolePermissions `up()`

CONTENT_EDITOR 角色校验：

- 必须存在
- `roleCode === 'CONTENT_EDITOR'`
- `deletedAt` 必须为 null（已逻辑删除 → 拒绝）
- `status === 'active'`（不可用 → 拒绝）

8 个固定权限：

- 必须全部存在
- `guidePermissionMatchesSeed()` 全部字段匹配（不仅 `permissionCode`）

关联写入规则不变：固定 ID 一致跳过；同 pair 已存在跳过；占用冲突拒绝。

---

## 五、新增测试场景

| 场景 | 套件 |
|---|---|
| `normalizeGuideCode` trim + 大写 | `normalize-guide-code.util.spec.ts` |
| 部门/主题保存大写编码 | `guide-config.spec.ts` unit |
| `CODE_A` 后 `code_a` → 409 | `guide-config.spec.ts` unit + HTTP |
| 前后空格混合编码归一化 | HTTP POST 断言 `create` 参数 |
| PUT `deptName/themeName/status/isVisible/sortOrder` 为 null → 400 | `guide-config.spec.ts` HTTP |
| PUT `icon`/`platformParamJson` 为 null 允许清空 | `guide-config.spec.ts` HTTP |
| 权限迁移双次 up 幂等 | `seed-guide-permissions-migration.spec.ts` |
| down 归属字段篡改拒绝 | `seed-guide-permissions-migration.spec.ts` |
| 角色已删除/不可用拒绝 | `seed-guide-role-permissions-migration.spec.ts` |
| 权限归属字段完整匹配 | `seed-guide-role-permissions-migration.spec.ts` |

---

## 六、完整验证结果

```bash
cd backend && npm run type-check   # ✅ 通过
cd backend && npm run build        # ✅ 通过
cd backend && npm test -- --runInBand  # ✅ 431 passed，35 skipped（共 466）
```

回归：`guide-config`、`seed-guide-*`、`auth`、`content`、`publish`、`public-content`、`system` 等原有套件均通过。

---

## 七、环境声明

- **是否连接或修改实际数据库**：否
- **未完成事项**：`guide_item_config`、`ServiceGuideModule` 真实调用、群众端 `/api/public/service-guide/*`、管理端办事指南页面

### 风险说明

- 编码全局大写为不可逆规范化；历史若存在小写编码数据（本阶段迁移未执行则无），需在执行迁移前统一。
- 逻辑删除后编码仍占用唯一槽位（033 策略延续）；需改编码才能重建同语义配置。

---

## 八、停止边界

本次完成后停止，不实现下一阶段功能。
