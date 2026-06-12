# 012 · Step 4 迁移安全闭环

**交付日期**：2026-06-12  
**基于**：011-step4-system-module-security-closure.md 验收发现的两项遗留问题  
**状态**：✅ 完成

---

## 一、修复背景

011 交付后验收发现两项问题：

| # | 问题 | 影响 |
|---|---|---|
| 1 | 种子迁移所有权不明：固定 ID + 相同 code 已存在时 up() 跳过，down() 却可能删除 | 违反“不得删除本迁移未创建的数据” |
| 2 | MySQL 集成测试 catch 初始化异常后 `return`，测试静默通过 | 并发保护无真实验证保障 |

---

## 二、种子数据所有权规则

### 核心原则

迁移成功后，凡存在于**固定种子 ID** 上的角色/权限记录，均可证明由 `SeedRbacData1749772800000` 插入。  
不新增业务表记录所有权；通过 **up() 拒绝预占固定 ID** 实现可证明性。

### up() 规则

| 场景 | 行为 |
|---|---|
| 固定 ID 已存在（无论 code 是否相同） | **拒绝迁移**，抛错（不含敏感信息） |
| 固定 ID 不存在，同 code 不同 ID 已存在 | **跳过插入**（非破坏性兼容） |
| 固定 ID 不存在，同 code 也不存在 | **插入**种子行 |
| 默认管理员 / 默认密码 | **永不创建** |

错误示例（不含密码、连接串等敏感信息）：

```
SeedRbacData up(): fixed role id 00000001-... already exists. Refusing to proceed.
```

### down() 非破坏性策略

| 场景 | 行为 |
|---|---|
| `sys_user_role` 引用种子角色 ID | **拒绝回滚** |
| `sys_role_permission` 引用种子角色/权限 ID | **拒绝回滚** |
| 固定 ID 存在但 code 与种子定义不匹配 | **拒绝回滚**（不得静默跳过或删除） |
| 固定 ID 不存在 | **跳过**（该种子行未被本迁移插入，如同 code 不同 ID 场景） |
| 固定 ID + 预期 code 均匹配 | **删除**该种子行 |
| 同 code 不同 ID 的既有记录 | **不删除** |
| 关联表记录 | **不自动删除** |

---

## 三、固定 ID 和业务 code 的冲突处理

```
up() 对每个种子角色/权限：
  ├─ 固定 ID 已占用？ → FAIL（所有权不可证明）
  ├─ 同 code 不同 ID？ → SKIP（避免唯一索引冲突，保留既有数据）
  └─ 均不存在？       → INSERT

down() 对每个种子角色/权限：
  ├─ 有关联引用？     → FAIL（保护业务数据）
  ├─ 固定 ID 不存在？ → SKIP
  ├─ 固定 ID code 不符？ → FAIL
  └─ ID + code 匹配？ → DELETE
```

---

## 四、迁移测试场景及结果

新增 `backend/test/seed-rbac-migration.spec.ts`，通过内存 Mock QueryRunner **直接调用** `migration.up()` / `migration.down()` 验证行为（非源码字符串扫描）。

| 场景 | 结果 |
|---|---|
| 空数据库时插入 3 角色 + 12 权限 | ✅ |
| 固定角色 ID 被其他 roleCode 占用时 up 失败 | ✅ |
| 固定权限 ID 被其他 permissionCode 占用时 up 失败 | ✅ |
| 固定 ID + 相同 code 已存在时 up 拒绝 | ✅ |
| 相同 roleCode、不同 ID 时不覆盖不新增 | ✅ |
| 相同 permissionCode、不同 ID 时不覆盖不新增 | ✅ |
| 有 user-role 引用时 down 拒绝 | ✅ |
| 有 role-permission 引用时 down 拒绝 | ✅ |
| down 只删除本迁移固定 ID 数据 | ✅ |
| 固定 ID code 不匹配时 down 拒绝 | ✅ |
| up/down/up 后数量和 code 正确 | ✅ |
| 不创建默认管理员或密码 | ✅ |

```
npm test -- --runInBand
Test Suites: 1 skipped, 5 passed, 5 of 6 total
Tests:       1 skipped, 202 passed, 203 total
```

---

## 五、MySQL 集成测试启用和跳过机制

### 机制

| 命令 | 行为 |
|---|---|
| `npm test` | `describe.skip` 跳过 `test/mysql-integration.spec.ts`，控制台输出 skip 警告 |
| `RUN_MYSQL_INTEGRATION=true npm run test:integration:mysql` | 执行真实 MySQL 集成测试，任何错误导致失败 |

### 实现要点

- 独立文件：`backend/test/mysql-integration.spec.ts`（从 `system.spec.ts` 移出）
- **移除** `try/catch` 静默吞错和 `if (!service) return` 伪通过
- `beforeAll` 连接失败直接抛错
- `afterAll` 清理测试用户及 `sys_user_role` 关联
- 日志不输出数据库密码

### npm script

```json
"test:integration:mysql": "RUN_MYSQL_INTEGRATION=true jest --runInBand test/mysql-integration.spec.ts"
```

---

## 六、MySQL 并发测试真实结果

```
RUN_MYSQL_INTEGRATION=true npm run test:integration:mysql

PASS test/mysql-integration.spec.ts
  MySQL integration — concurrent SUPER_ADMIN protection
    ✓ 两个并发禁用操作不会同时移除最后的有效 SUPER_ADMIN (68 ms)

Tests: 1 passed, 1 total
```

### 观察到的真实 SQL 行为

并发 `disable()` 时日志显示：

- `SELECT ... FROM sys_user ... FOR UPDATE`（用户行悲观锁）
- `SELECT ... FROM sys_role ... FOR UPDATE`（SUPER_ADMIN 角色行悲观锁）
- 一个事务 `UPDATE status = disabled` + `COMMIT`
- 另一个事务 `ROLLBACK`（触发“最后一个有效的超级管理员”保护）

断言：

- `Promise.allSettled` 结果：1 fulfilled + 1 rejected
- rejected 原因含 `最后一个有效的超级管理员`
- 回查 active SUPER_ADMIN 用户数 ≥ 1

---

## 七、migration revert/run 结果

```
# migration:show（revert 前）
[X] CreateRbacTables1749686400000
[X] SeedRbacData1749772800000

# migration:revert
检查 user_role / role_permission 引用计数 = 0
逐条验证固定 ID + code 后删除 12 权限 + 3 角色
Migration SeedRbacData1749772800000 has been reverted successfully.

# migration:show（revert 后）
[X] CreateRbacTables1749686400000
[ ] SeedRbacData1749772800000

# migration:run（再次）
Migration SeedRbacData1749772800000 has been executed successfully.

# 最终 migration:show
[X] CreateRbacTables1749686400000
[X] SeedRbacData1749772800000
```

开发库无业务关联引用种子角色，revert 成功；若存在关联，down() 将拒绝并保护数据。

---

## 八、后端测试通过数和跳过数

| 套件 | 命令 | 通过 | 跳过 |
|---|---|---|---|
| 单元 + mock 集成 | `npm test -- --runInBand` | 202 | 1（MySQL 集成） |
| MySQL 集成 | `npm run test:integration:mysql` | 1 | 0 |
| **合计** | 两者均执行 | **203** | **1**（仅默认 test 跳过） |

---

## 九、三端构建结果

```
# backend
npm run type-check  →  ✅ 0 errors
npm run build       →  ✅

# kiosk-app
npm run build       →  ✅ built in 1.88s

# admin-web
npm run type-check  →  ✅ 0 errors
npm run build       →  ✅ built in 831ms
```

- `/api/public/*` 未改动，仍可匿名访问
- admin 接口权限规则不变
- kiosk-app 无新增输入框
- 未实现二期功能

---

## 十、HighGo 未实连说明

- 种子迁移仍使用 TypeORM Manager API，无 MySQL 专属 SQL
- 迁移行为测试通过内存 Mock QueryRunner 验证逻辑，不依赖特定方言
- MySQL 并发集成测试验证 `pessimistic_write` 在 MySQL 8 上生效
- HighGo 生产库实连迁移与并发锁冒烟待部署前执行

---

## 十一、剩余风险

| 风险 | 等级 | 说明 |
|---|---|---|
| 同 code 不同 ID 时种子固定 ID 行未插入 | 低 | 需运维对齐 ID 或沿用既有记录；属非破坏性设计 |
| 开发库 revert 需无业务关联 | 信息 | 有关联时 down() 正确拒绝 |
| CI 默认不跑 MySQL 集成 | 低 | 需流水线显式执行 `test:integration:mysql` |
| HighGo 未实连 | 低 | 延续前期说明 |

---

## 十二、是否具备进入 Step 5 ContentModule 的条件

| 检查项 | 状态 |
|---|---|
| 种子迁移所有权可证明 | ✅ |
| down() 非破坏性 | ✅ |
| 迁移行为自动化测试 11 场景 | ✅ |
| MySQL 并发 SA 保护真实验证 | ✅ |
| migration revert/run 周期验证 | ✅ |
| 203 项测试（含集成）全绿 | ✅ |
| 三端构建全绿 | ✅ |
| 未越界实现 ContentModule | ✅ |

**结论：Step 4 迁移安全闭环已完成，具备进入 Step 5 ContentModule 的条件。**
