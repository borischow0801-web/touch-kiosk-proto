# 033 · Step 10 GuideConfigModule Phase 1 数据库完整性与迁移安全收尾

**交付日期**：2026-06-15  
**基于**：032-step10-guide-config-backend-phase1.md  
**状态**：✅ 完成（未进入 guide_item_config、共享平台或群众端下一阶段）

---

## 一、032 遗留风险与修复动机

032 采用**应用层唯一 + 非唯一索引**策略，存在以下并发风险：

- 两个请求同时通过 `findOne` 查重后并发 `INSERT`，可能短暂产生重复编码的有效记录。
- 逻辑删除后允许同编码重建，与政务配置编码应稳定、可追溯的业务预期不一致。

本收尾在 **CreateGuideMappingTables 迁移尚未于实际库执行** 的前提下，直接修正该迁移（不新增补丁迁移）。

---

## 二、编码唯一性与逻辑删除策略

### 最终策略：编码全局唯一

| 层级 | 实现 |
|---|---|
| 数据库 | `uk_guide_dept_mapping_dept_code`、`uk_guide_theme_mapping_theme_code`，`TableIndex.isUnique: true` |
| 实体 | `@Index(..., { unique: true })` 与迁移索引名一致 |
| 服务层查重 | `findOne({ withDeleted: true })` — 含软删除行，友好 409 |
| 并发兜底 | `save()` 捕获 `QueryFailedError`（MySQL `errno=1062` / HighGo `code=23505`）→ 409 |

**逻辑删除含义**：`deleted_at` 仅用于列表过滤与审计；**编码占用不释放**，删除后不可用相同 `dept_code`/`theme_code` 重新创建。

---

## 三、唯一冲突 → 409 转换

`guide-config/utils/unique-code.util.ts`：

- 识别 TypeORM `QueryFailedError`。
- MySQL：`driverError.errno === 1062`。
- HighGo/PostgreSQL：`driverError.code === '23505'`。
- 兜底匹配索引名 `uk_guide_dept_mapping_dept_code` / `uk_guide_theme_mapping_theme_code`。

`DeptMappingService.saveDept()` / `ThemeMappingService.saveTheme()` 在捕获后抛出 `ConflictException`，HTTP 层返回 409，**不会**泄漏为 500。

---

## 四、权限迁移一致性规则

### SeedGuidePermissions `up()`

| 场景 | 行为 |
|---|---|
| 固定 ID 不存在 + code 不存在 | 插入 |
| 固定 ID 已存在且全部归属字段一致 | **跳过**（可重复执行） |
| 固定 ID 已存在但归属字段不一致 | **拒绝** |
| code 已存在于不同 ID | **拒绝**（不再跳过） |

归属字段：`permissionCode`、`permissionName`、`moduleCode`、`permissionType`、`sortOrder`（`guidePermissionMatchesSeed()`）。

### SeedGuideRolePermissions `up()`

写入前强制校验：

1. `CONTENT_EDITOR` 固定角色 ID 存在且 `roleCode === 'CONTENT_EDITOR'`。
2. 8 个固定权限 ID 全部存在。
3. 每个权限 ID 的 `permissionCode` 与种子定义一致。

关联写入：

- 固定关联 ID 已存在且值一致 → 跳过。
- 相同 role-permission 对已存在（不同 ID）→ 跳过。
- 固定 ID 被其他数据占用 → 拒绝。

`down()` 仅删除本迁移固定 ID 的 role-permission，不触碰其他关联。

---

## 五、DTO 规范化与状态校验

| 规则 | 实现 |
|---|---|
| `status` | `UpdateDeptMappingDto` 仅允许 `active`、`disabled` |
| 非空字符串 | `@IsNotBlankString()` — 拒绝 `''` 与纯空白 |
| 编码 trim | `@TrimString()` + 服务层 `trim()`；查重与保存使用规范化编码 |
| `platformParamJson` | 保持 text 存储 + `@IsJsonString()` |
| 未知字段 | 全局 `forbidNonWhitelisted` → 400 |

---

## 六、测试覆盖（新增/更新）

| 套件 | 新增要点 |
|---|---|
| `guide-migration.spec.ts` | 两个 `isUnique: true` 索引 |
| `highgo-metadata.spec.ts` | 实体元数据 `uk_*` 唯一索引 |
| `guide-config.spec.ts` | 软删除同编码 409；并发唯一冲突 409；空白/非法 status/未知字段/trim 重复 409 |
| `seed-guide-permissions-migration.spec.ts` | 双次 up 幂等；同码异 ID 失败；固定 ID 一致跳过 |
| `seed-guide-role-permissions-migration.spec.ts` | 角色/权限前置校验；双次 up；down 不删外来数据 |

---

## 七、验证结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run type-check` | ✅ |
| `cd backend && npm run build` | ✅ |
| `cd backend && npm test -- --runInBand` | ✅ 416 passed，35 skipped |
| `cd admin-web && npm run type-check && npm run build && npm test` | ✅ 129 passed |
| `cd kiosk-app && npm run build && npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ |
| `cd kiosk-app/tests && npm test` | ✅ 91 passed |

### 远程探测

| URL | 结果 |
|---|---|
| `http://10.217.19.22:5183` | 200 |
| `http://10.217.19.22:5183/api/public/home/config` | 200 |
| `http://10.217.19.22:5184/login` | 200 |
| `http://10.217.19.22:3100/api/admin/auth/profile`（未登录） | 401 |

---

## 八、修改文件清单

### 修改

- `backend/src/database/migrations/1749895200000-CreateGuideMappingTables.ts`
- `backend/src/database/migrations/1749898800000-SeedGuidePermissions.ts`
- `backend/src/database/migrations/1749902400000-SeedGuideRolePermissions.ts`
- `backend/src/database/entities/guide-dept-mapping.entity.ts`
- `backend/src/database/entities/guide-theme-mapping.entity.ts`
- `backend/src/guide-config/dept-mapping.service.ts`
- `backend/src/guide-config/theme-mapping.service.ts`
- `backend/src/guide-config/dto/*.ts`（create/update + 校验器）
- `backend/src/guide-config/utils/unique-code.util.ts`（新增）
- `backend/test/guide-*.spec.ts`、`backend/test/seed-guide-*.spec.ts`、`backend/test/highgo-metadata.spec.ts`
- `CLAUDE.md`

### 未修改

- `admin-web/**`、`kiosk-app/**`、`deploy/**`、端口、`backend/.env`、实际数据库

---

## 九、环境声明

- **是否连接或修改实际数据库**：否
- **是否进入下一阶段**：否（`guide_item_config`、ServiceGuideModule 真实调用、群众端接口、管理端页面均未实现）
