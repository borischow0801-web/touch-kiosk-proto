# 006 · Step 2 数据库基础建设

> TypeORM 接入、RBAC 实体创建、迁移管理，完成 Step 2 数据库基础。

---

## 修改和新增文件

| 文件 | 类型 | 说明 |
|---|---|---|
| `backend/src/database/entities/base-business.entity.ts` | 新建 | 抽象基类：id(varchar36)、created_at、updated_at、deleted_at，含 @BeforeInsert UUID 生成 |
| `backend/src/database/entities/base-relation.entity.ts` | 新建 | 关联表抽象基类：id、created_at |
| `backend/src/database/entities/sys-user.entity.ts` | 新建 | 用户实体，继承 BaseBusinessEntity |
| `backend/src/database/entities/sys-role.entity.ts` | 新建 | 角色实体，继承 BaseBusinessEntity |
| `backend/src/database/entities/sys-user-role.entity.ts` | 新建 | 用户角色关联表，继承 BaseRelationEntity |
| `backend/src/database/entities/sys-permission.entity.ts` | 新建 | 权限实体（无 deleted_at，遵循 database.md），字段内联定义 |
| `backend/src/database/entities/sys-role-permission.entity.ts` | 新建 | 角色权限关联表，继承 BaseRelationEntity |
| `backend/src/database/migrations/1749686400000-CreateRbacTables.ts` | 新建 | 第一份迁移：建立 5 张 RBAC 表 |
| `backend/src/database/database.module.ts` | 新建 | TypeORM NestJS 模块，`synchronize: false` |
| `backend/src/database/data-source.ts` | 新建 | TypeORM CLI 用 DataSource，支持 `migration:run` / `migration:revert` |
| `backend/src/app.module.ts` | 修改 | 引入 ConfigModule（加载 .env）和 DatabaseModule |
| `backend/src/main.ts` | 修改 | 顶部加 `import 'dotenv/config'` 确保 .env 先于模块加载 |
| `backend/package.json` | 修改 | 添加 TypeORM 依赖；添加 `migration:run/revert/show` 脚本；`test` 移除 `--forceExit` |
| `backend/.env.example` | 新建 | 环境变量示例，不含真实凭据 |
| `backend/.gitignore` | 新建 | 排除 `.env`、`dist/`、`node_modules/` |
| `backend/test/stats.spec.ts` | 修改 | `afterAll` 改为 `async/await app.close()`，彻底解决 Jest 强退告警 |

---

## 实体与关系说明

### 继承结构

```
BaseBusinessEntity (abstract)
  ├── SysUser        — 用户，含 deleted_at
  └── SysRole        — 角色，含 deleted_at

BaseRelationEntity (abstract)
  ├── SysUserRole    — 用户角色关联，无 deleted_at
  └── SysRolePermission — 角色权限关联，无 deleted_at

SysPermission        — 权限表，按 database.md 规范无 deleted_at，字段内联定义
```

### 关系说明

- `SysUser ←→ SysRole`：通过 `SysUserRole` 多对多（手动关联表，独立 varchar(36) PK）
- `SysRole ←→ SysPermission`：通过 `SysRolePermission` 多对多（独立 varchar(36) PK）

### 字段类型合规

| 规范 | 实现 |
|---|---|
| 主键 varchar(36) | `@PrimaryColumn({ type: 'varchar', length: 36 })` ✓ |
| UUID 后端生成 | `@BeforeInsert()` + `uuidv4()`（已有 uuid 包）✓ |
| 禁止自增主键 | 无 `@PrimaryGeneratedColumn()` ✓ |
| 状态字段 varchar | `status` 列均用 `varchar(20)` ✓ |
| 禁止 enum | 无 TypeORM enum 列 ✓ |
| 禁止 JSON/JSONB | 无 json/jsonb 列 ✓ |
| 业务表含时间字段 | `@CreateDateColumn`、`@UpdateDateColumn`、`@DeleteDateColumn` ✓ |
| 逻辑删除 | `@DeleteDateColumn` 启用 TypeORM 软删除，find() 自动加 `WHERE deleted_at IS NULL` ✓ |
| synchronize=false | 已在 DatabaseModule 和 DataSource 双重确认 ✓ |

---

## 索引与唯一约束

| 表 | 唯一约束 | 普通索引 |
|---|---|---|
| sys_user | uk_sys_user_username (username) | idx_status, idx_deleted_at |
| sys_role | uk_sys_role_role_code (role_code) | idx_status, idx_deleted_at |
| sys_user_role | uk pair (user_id, role_id) | idx_user_id, idx_role_id |
| sys_permission | uk_sys_permission_code (permission_code) | idx_module_code |
| sys_role_permission | uk pair (role_id, permission_id) | idx_role_id, idx_permission_id |

---

## 数据库兼容性说明

| 项目 | MySQL 8（开发）| HighGo/PostgreSQL（生产）|
|---|---|---|
| varchar(36) PK | ✓ | ✓ |
| timestamp 时间列 | ✓ | ✓（PostgreSQL 的 timestamp 等价） |
| DEFAULT CURRENT_TIMESTAMP | ✓ | ✓ |
| utf8mb4 字符集 | ✓ | HighGo 迁移时可忽略（不通用） |
| ENGINE=InnoDB | ✓ | HighGo 迁移时需去除（PostgreSQL 无引擎概念） |
| TINYINT | 未使用（本批无布尔列）| — |

**HighGo 迁移注意事项（生产）：**
- 删除 `ENGINE=InnoDB` 子句
- 删除 `DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` 子句
- 反引号（`` ` ``）替换为双引号（`""`）用于标识符引用

---

## 迁移说明

| 迁移 | 时间戳 | 包含内容 |
|---|---|---|
| CreateRbacTables | 1749686400000 | 创建 sys_user、sys_role、sys_user_role、sys_permission、sys_role_permission |

`up()` 使用 `CREATE TABLE IF NOT EXISTS` 保证幂等。  
`down()` 按反依赖顺序 DROP（先删关联表再删主表）。

---

## 验证命令与实际结果

### 构建与类型检查

| 命令 | 结果 |
|---|---|
| `backend: npm run type-check` | ✅ 0 错误 |
| `backend: npm run build` | ✅ 通过 |
| `backend: npm test` | ✅ 35 passed（无 Force exiting 告警） |
| `kiosk-app: npm run build` | ✅ 通过 |
| `admin-web: npm run type-check` | ✅ 0 错误 |
| `admin-web: npm run build` | ✅ 通过 |

### 实体静态验证

| 验证项 | 结果 |
|---|---|
| TypeORM DataSource 发现 5 个实体 | ✅ SysUser, SysRole, SysUserRole, SysPermission, SysRolePermission |
| 迁移文件编译产物存在 | ✅ dist/database/migrations/1749686400000-CreateRbacTables.js |
| 无自增主键 | ✅ |
| 无数据库 enum 类型 | ✅ |
| 无 JSON/JSONB 列 | ✅ |
| 无存储过程/触发器 | ✅ |
| synchronize=false（双重确认）| ✅ DatabaseModule + DataSource |

### MySQL 实连验证（MySQL 8.0.46）

| 操作 | 结果 |
|---|---|
| 首次 `npm run migration:run` | ✅ CreateRbacTables1749686400000 executed |
| 验证表结构（5 张业务表）| ✅ sys_user/role/user_role/permission/role_permission |
| 索引验证 | ✅ 所有 UK 和普通索引均按设计创建 |
| `npm run migration:revert` | ✅ 5 张业务表全部 DROP |
| 回滚后验证（仅剩 migrations 表）| ✅ |
| 再次 `npm run migration:run` | ✅ 重新建表成功 |

### Public API 无回归

| 接口 | 结果 |
|---|---|
| GET /api/public/home/config | ✅ code 0 |
| GET /api/public/service-guide/depts | ✅ 4 depts |
| POST /api/public/stats/click（合法）| ✅ code 0 |

---

## 遗留风险与未完成事项

1. **HighGo 迁移适配**：当前迁移 SQL 含 MySQL 专属语法（ENGINE=InnoDB、反引号标识符、utf8mb4）。生产部署前需创建 HighGo 版本迁移文件，替换为标准 SQL。可在 Step 3/4 实现实体后统一处理。

2. **缺少专属数据库**：本次使用临时开发数据库进行验证。生产和正式开发需由 DBA 创建专属数据库（`touch_kiosk`）并授权独立用户。`.env.example` 已提供配置模板。

3. **DB 连接失败时应用无法启动**：TypeORM 连接失败会阻止 NestJS 启动（`retryAttempts: 1` 只减少重试次数，不跳过连接）。这是有意行为——生产必须有 DB。测试（`npm test`）使用 TestingModule 隔离，不受影响。

4. **`updated_at` 不依赖数据库触发器**：`@UpdateDateColumn` 在 TypeORM `save()` 时自动更新，直接 SQL UPDATE 不会更新此字段。这是 HighGo 兼容的妥协（HighGo 无 `ON UPDATE CURRENT_TIMESTAMP`）。

5. **Step 3（AuthModule）前置工作**：实体已就绪，Step 3 可直接在 SysUser / SysRole 上构建登录和 JWT 逻辑，无需重新设计表结构。
