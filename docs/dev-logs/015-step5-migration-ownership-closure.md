# 015 · Step 5 迁移所有权与 HighGo 回滚兼容闭环
> **历史环境警告（2026-06-12）**：本文中的 `oms_db`、`mydb`、`MYSQL_CONTENT_TEST_*` 仅用于保留当时交付事实，现已全部停用，严禁复制执行。当前开发库为 `touch_kiosk_dev`，测试库为 `touch_kiosk_test`；有效变量与保护规则以 `backend/.env.example`、`CLAUDE.md` 为准。


**交付日期**：2026-06-12  
**基于**：014-step5-content-module-phase1-acceptance-fix.md  
**状态**：✅ 完成（PublishModule 未实现）

---

## 一、问题背景

014 将 `uk_content_version_content_version_no` 与 `fk_content_item_current_version_id` 同时放入 `CreateContentTables` 与 `AlterContentTablesIntegrity`，导致：

- 迁移职责重叠，新库与修订库路径不一致
- `Alter.down()` 将 `smallint` 回退为 `tinyint`，破坏 HighGo 回滚兼容性

本轮按所有权拆分并补齐行为/生命周期测试。

---

## 二、迁移所有权划分

### CreateContentTables1749859200000

| 类别 | 内容 |
|---|---|
| 表 | `content_category`、`content_item`、`content_version`、`content_relation` |
| 字段 | `content_item.is_top` / `is_recommend` 为 **smallint**（新库直接可跑 HighGo） |
| 普通索引 | 各表 `idx_*`、关联表 `uk_content_relation_triple` |
| 外键 | `fk_content_category_parent_id`、`fk_content_item_category_id`、`fk_content_version_content_id`、`fk_content_relation_source_id`、`fk_content_relation_target_id` |
| **不创建** | `uk_content_version_content_version_no`、`fk_content_item_current_version_id` |

### AlterContentTablesIntegrity1749873600000

| 类别 | 内容 |
|---|---|
| up() | `tinyint`→`smallint` 归一（幂等）；创建 `uk_content_version_content_version_no`；清理错误 `current_version_id`；创建 `fk_content_item_current_version_id` |
| down() | **仅**删除上述唯一索引与外键（存在性检查）；**不回退**列类型 |
| down() 后结构 | 与当前 `CreateContentTables` 定义一致（smallint 保留，无 Alter 约束） |

### 路径一致性

| 场景 | 结果 |
|---|---|
| 全新库 `migration:run` 全部 5 条 | Create 建表（smallint）→ Alter 补约束 |
| 已执行旧 Create（tinyint）的开发库 | Alter up 改 smallint + 补约束 |
| `migration:revert` 仅回滚 Alter | smallint 保留，约束移除 |

---

## 三、数据库基线同步

| 文档 | 变更 |
|---|---|
| `CLAUDE.md` | 布尔标志字段：`tinyint` → `smallint`，仅允许 0/1 |
| `docs/database.md` | 新增 §1.4 布尔标志字段规范；`content_item` 字段注释补充 smallint |

---

## 四、迁移测试

### 行为测试（内存 Mock，直接执行 up/down）

文件：`backend/test/alter-content-integrity-migration.spec.ts`

| 用例 | 结果 |
|---|---|
| Create up() 不创建 Alter 拥有的索引/外键 | ✅ |
| Alter up() 在 Create 基线上创建约束并保持 smallint | ✅ |
| Alter up() 将遗留 tinyint 归一为 smallint | ✅ |
| Alter down() 仅删约束、保留 smallint | ✅ |
| down() 约束已不存在时安全跳过 | ✅ |
| up/down/up 周期约束可恢复 | ✅ |
| down() 源码无 tinyint / changeColumn | ✅ |

### 静态扫描（补充）

文件：`backend/test/content-migration.spec.ts`（已更新所有权断言）

### MySQL 生命周期测试（真实隔离库 `oms_db`）

文件：`backend/test/content-migration-lifecycle.spec.ts`  
启用：`RUN_MYSQL_MIGRATION_LIFECYCLE=true` + `MYSQL_CONTENT_TEST_DATABASE` + `MYSQL_CONTENT_TEST_CONFIRM=true`

| 用例 | 结果 |
|---|---|
| revert 后 smallint 保留、Alter 约束消失 | ✅ |
| 再次 run 恢复约束、smallint 不变 | ✅ |
| 重复 version_no 被唯一索引拒绝 | ✅ |
| 无效 current_version_id 被外键拒绝 | ✅ |

### 专用测试库手动 CLI 周期（`oms_db`）

```bash
DB_NAME=oms_db npm run migration:show    # 5 条均为 [X]
DB_NAME=oms_db npm run migration:revert  # 回滚 AlterContentTablesIntegrity1749873600000
DB_NAME=oms_db npm run migration:show    # Alter 为 [ ]
DB_NAME=oms_db npm run migration:run     # 重新执行 Alter
DB_NAME=oms_db npm run migration:show    # Alter 恢复 [X]
```

| 步骤 | 实际结果 |
|---|---|
| 初始 show | 5 条 `[X]` |
| revert | 成功；仅 DROP FK `fk_content_item_current_version_id` + DROP INDEX `uk_content_version_content_version_no` |
| revert 后 show | Alter 为 `[ ]`；`is_top`/`is_recommend` 仍为 **smallint** |
| run | 成功；重建唯一索引与外键 |
| 最终 show | 5 条 `[X]` |

开发库 `mydb` 保持 5 条迁移均为 `[X]`，未执行 revert。

---

## 五、测试库安全

Content 集成测试新增确认变量：

```bash
MYSQL_CONTENT_TEST_DATABASE=oms_db \
MYSQL_CONTENT_TEST_CONFIRM=true \
npm run test:integration:mysql:content
```

必须同时满足：

- `NODE_ENV` ≠ `production`
- `DB_DIALECT=mysql`
- `MYSQL_CONTENT_TEST_DATABASE` 已设置且 ≠ `DB_NAME`
- `MYSQL_CONTENT_TEST_CONFIRM=true`

不得删除或重建未经确认的数据库。

---

## 六、HighGo 兼容性验证

文件：`backend/test/highgo-metadata.spec.ts`

| 用例 | 结果 |
|---|---|
| 9 实体元数据无连接构建 | ✅ |
| 禁止 tinyint/enum/json/jsonb | ✅ 0 违规 |
| `is_top`/`is_recommend` 为 smallint | ✅ |

`Alter.down()` 不再含 `tinyint`，HighGo 回滚后列类型保持兼容。

---

## 七、全量验证

```bash
cd backend
npm run type-check          # ✅
npm run build               # ✅
npm test -- --runInBand     # ✅ 284 passed, 13 skipped
npm run test:integration:mysql                                    # ✅ 1 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:integration:mysql:content                            # ✅ 8 passed
MYSQL_CONTENT_TEST_DATABASE=oms_db MYSQL_CONTENT_TEST_CONFIRM=true \
  npm run test:migration:lifecycle                                  # ✅ 4 passed
npm run migration:show      # ✅ mydb 5 条 [X]

cd ../kiosk-app && npm run build                    # ✅
cd ../admin-web && npm run type-check && npm run build  # ✅
```

### 测试计数

| 范围 | passed | skipped |
|---|---|---|
| 默认 `npm test` | 284 | 13 |
| 显式 MySQL SA 集成 | 1 | 0 |
| 显式 Content 集成 | 8 | 0 |
| 显式迁移生命周期 | 4 | 0 |
| **含显式集成合计** | **297** | **13** |

跳过的 13 项：3 个集成套件默认 `describe.skip`（需环境变量显式启用）。

---

## 八、修改文件清单

| 文件 | 说明 |
|---|---|
| `1749859200000-CreateContentTables.ts` | 移除 Alter 拥有的索引/外键 |
| `1749873600000-AlterContentTablesIntegrity.ts` | down() 仅删约束，保留 smallint |
| `CLAUDE.md` / `docs/database.md` | smallint 基线 |
| `content-mysql-integration.spec.ts` | 增加 `MYSQL_CONTENT_TEST_CONFIRM` |
| `alter-content-integrity-migration.spec.ts` | **新建** 行为测试 |
| `content-migration-lifecycle.spec.ts` | **新建** MySQL 周期测试 |
| `content-migration.spec.ts` | 更新所有权断言 |
| `package.json` | `test:migration:lifecycle` script |

---

## 九、未完成项与剩余风险

| 项 | 说明 |
|---|---|
| HighGo 真实实例迁移 | 元数据与 down() 源码已验证；生产瀚高环境仍需首次 `migration:run` 冒烟 |
| 测试库创建权限 | 本环境无法 `CREATE DATABASE`，使用已有 `oms_db`；须显式 `CONFIRM` |
| PublishModule | `current_version_id` 写入仍待后续发布模块 |
| 其他表布尔字段 | 本期仅 content_item 标志位；若后续表新增 0/1 字段须遵循 smallint 基线 |

---

## 十、明确未做事项

- PublishModule
- 群众端内容接口 / 页面
- admin-web、kiosk-app 业务改动
- 二期功能
