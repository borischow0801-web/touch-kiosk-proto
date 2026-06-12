# Step 4 SystemModule 安全闭环 — 恢复报告

> **⚠️ 历史快照**：本文件记录 2026-06-11 Claude Code 中断时的现场状态。  
> **当前状态**请参阅 `docs/dev-logs/011-step4-system-module-security-closure.md`（已于 2026-06-12 完成闭环）。

生成时间：2026-06-11

---

## 一、Git 状态（中断时未提交变更）

以下文件已修改但未提交：

| 状态 | 文件 |
|---|---|
| 新增 | `backend/src/system/constants/role-codes.ts` |
| 新增 | `backend/src/system/dto/assign-roles.dto.ts` |
| 修改 | `backend/src/system/dto/assign-permissions.dto.ts` |
| 修改 | `backend/src/system/users.service.ts` |
| 修改 | `docs/api-spec.md` |

---

## 二、中断时已完成部分

### 2.1 api-spec.md 补全

- 添加 `PUT /api/admin/system/users/:id/roles` 端点说明及约束
- 添加 `GET /api/admin/system/permissions` 端点说明及返回字段
- 为用户管理所有端点标注所需权限码

### 2.2 共享常量模块

新建 `backend/src/system/constants/role-codes.ts`：

```typescript
export const SUPER_ADMIN_CODE = 'SUPER_ADMIN';
export const ALLOWED_ROLE_CODES = new Set(['SUPER_ADMIN', 'CONTENT_EDITOR', 'PUBLISH_REVIEWER']);
```

### 2.3 DTO 补全

**新建 `assign-roles.dto.ts`**（`roleIds` 字段含 `@ArrayUnique` + `@MaxLength(36, {each:true})`）

**修改 `assign-permissions.dto.ts`**（原来缺少 `@ArrayUnique` 和 `@MaxLength`，已补齐）

### 2.4 UsersService 全量重写（311 行）

核心变更：

| 方法 | 变更内容 |
|---|---|
| `update(id, dto, currentUserId)` | 新增第三参数；`dto.status=disabled` 时先检查自禁；事务内加行锁再调 `guardLastSuperAdminInTx` |
| `remove(id, currentUserId)` | 自删保护；事务内锁行 → `guardLastSuperAdminInTx` → softDelete |
| `disable(id, currentUserId)` | 自禁保护；事务内锁行 → `guardLastSuperAdminInTx` → update status |
| `assignRoles(id, dto, currentUserId)` | **新增**：自改角色保护；事务外验证 roleIds 合法性；事务内 SA 撤除保护；先删后插 `SysUserRole` |
| `guardLastSuperAdminInTx(targetUserId, manager)` | **新增私有方法**：锁 SUPER_ADMIN role 行（FOR UPDATE）作序列化点；查找其余有效 SA；无则抛 403 |

---

## 三、中断时未完成部分（已由 Cursor 2026-06-12 补完）

| 优先级 | 文件 | 中断时状态 | 当前状态 |
|---|---|---|---|
| P0 | `users.controller.ts` | 待修复 TS2554 | ✅ 已完成 |
| P0 | `permissions.controller.ts` | 待新建 | ✅ 已完成 |
| P0 | `admin-api.module.ts` | 待注册 | ✅ 已完成 |
| P0 | `roles.service.ts` 共享常量 + DTO | 部分 | ✅ 已完成 |
| P0 | `SeedRbacData` 迁移 | 不安全初版 | ✅ 安全重写 |
| P1 | `system.spec.ts` | 15 项失败 | ✅ 192/192 通过 |
| P2 | `011` 交付报告 | 未生成 | ✅ 已生成 |
| P2 | `CLAUDE.md` | 待更新 | ✅ 已更新 |

---

## 四、恢复后的执行顺序（已全部完成）

```
1. ✅ 修复 users.controller.ts
2. ✅ 新建 permissions.controller.ts
3. ✅ 更新 admin-api.module.ts
4. ✅ 更新 roles.service.ts
5. ✅ 重写 seed migration + DB_MIGRATIONS
6. ✅ npm run type-check
7. ✅ npm run build
8. ✅ 补写 system.spec.ts
9. ✅ npm test — 192/192
10. ✅ migration:show / run / revert / run
11. ✅ 011-step4-system-module-security-closure.md
12. ✅ CLAUDE.md 状态更新
```

---

## 五、最终构建状态速查（2026-06-12）

| 检查项 | 状态 |
|---|---|
| `npm run type-check` | ✅ 0 errors |
| `npm run build` | ✅ 成功 |
| `npm test` | ✅ 192/192 |
| `migration:show` | ✅ 两个迁移均为 [X] |
| `migration:run/revert/run` | ✅ 验证通过 |
| kiosk-app / admin-web build | ✅ 通过 |
