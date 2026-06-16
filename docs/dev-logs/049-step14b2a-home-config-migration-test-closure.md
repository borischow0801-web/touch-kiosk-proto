# 049 · Step 14B-2A 首页配置迁移测试收口

**交付日期**：2026-06-16  
**基于**：048-step14b2-home-config-entities-migrations.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

本阶段补齐首页配置 **角色权限种子** 的内存 mock 测试，并在 HighGo 元数据测试中增加首页配置实体断言。**未修改** Entity、Migration 源码（测试全部通过，无需改动）。

**未修改**：admin-web、kiosk-app、deploy、基线文档、环境配置。  
**未连接或操作**任何数据库。

---

## 二、修改文件清单

| 文件 | 变更 |
|---|---|
| `backend/test/seed-home-config-role-permissions-migration.spec.ts` | **新增**，13 个用例 |
| `backend/test/highgo-metadata.spec.ts` | 新增首页配置实体元数据断言 |
| `docs/dev-logs/049-step14b2a-home-config-migration-test-closure.md` | 本报告 |

---

## 三、新增测试覆盖点

### `seed-home-config-role-permissions-migration.spec.ts`

| # | 场景 |
|---|---|
| 1 | CONTENT_EDITOR 存在且 active → 写入 **7** 条 `role_permission` |
| 2 | 连续 `up()` 幂等，不重复插入 |
| 3 | 固定 id 已存在且字段一致 → 跳过 |
| 4 | 固定 id 已存在但 roleId/permissionId 不一致 → 失败 |
| 5 | roleId+permissionId 组合已存在但 id 不同 → 跳过 |
| 6 | CONTENT_EDITOR 不存在 → 失败 |
| 7 | CONTENT_EDITOR 逻辑删除 → 失败 |
| 8 | CONTENT_EDITOR 非 active → 失败 |
| 9 | CONTENT_EDITOR roleCode 不匹配 → 失败 |
| 10 | home permission 不存在 → 失败 |
| 11 | home permission 归属字段不一致 → 失败 |
| 12 | `down()` 只删本 seed 固定 id，保留外来关联 |
| 13 | 固定 id 字段不一致时 `down()` 失败 |

### `highgo-metadata.spec.ts` 补充断言

| 实体 | 断言 |
|---|---|
| `home_config` | `current_version_id` 为 varchar、非 generated；`deleted_at` 存在 |
| `home_config_version` | `top_banner_json`、`theme_json` 为 text；**无** `deleted_at` |
| `home_module` | `home_config_version_id` 存在；**无** `home_config_id`；`is_visible` 为 smallint；`deleted_at` 存在 |
| 索引 | `uk_home_config_version_config_version_no` 为 unique |

---

## 四、验证结果

```bash
git diff --check backend/test/...
cd backend && npm test -- --runInBand
```

| 指标 | 结果 |
|---|---|
| `git diff --check` | ✅ 通过 |
| Test Suites | **31 passed**, 6 skipped, 37 total |
| Tests | **591 passed**, 35 skipped, 626 total |
| 新增套件 | `seed-home-config-role-permissions-migration.spec.ts` 13/13 通过 |
| HighGo 元数据 | 首页配置断言通过 |

**跳过说明**：6 个 skipped 为需真实 MySQL 的集成测试，本环境未连库。

---

## 五、声明

- **未修改** admin-web、kiosk-app、deploy、基线文档。
- **未修改** Entity / Migration 源码（测试未暴露缺陷）。
- **未连接或操作**任何数据库实例。

---

## 六、下一步（14B-3）

1. 实现 `HomeConfigService`：`PUT` 隐式草稿、状态机、模块 CRUD/排序。
2. 实现 Admin API `/api/admin/home/*`。
3. 扩展 `PublishService` 支持 `bizType=home_config`。
