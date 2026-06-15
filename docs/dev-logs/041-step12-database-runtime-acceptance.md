# 041 · Step 12 专用数据库迁移与运行验收

**交付日期**：2026-06-15  
**基于**：040-step12-service-guide-pagination-closure.md  
**执行方**：Codex  
**状态**：通过

---

## 一、执行范围

本次仅执行：

- 核对开发环境数据库连接目标
- 审查待执行的办事指南迁移
- 在项目专用开发库执行迁移
- 验证迁移记录、表结构、权限数据和缓存写入
- 验证本机及远程 HTTP 访问

本次未修改业务代码，未连接或操作 `oms_db`，未执行真实共享平台对接。

---

## 二、数据库连接确认

实际连接：

| 项目 | 结果 |
|---|---|
| 数据库类型 | MySQL 8 |
| 数据库 | `touch_kiosk_dev` |
| 用户 | `touch_kiosk_dev_user@%` |
| 其他项目数据库 | 未连接、未操作 |

项目配置、`CLAUDE.md` 和实际数据库身份一致。

---

## 三、迁移执行结果

迁移前已有 7 个迁移完成，本次执行以下 7 个迁移：

1. `CreateGuideMappingTables1749895200000`
2. `SeedGuidePermissions1749898800000`
3. `SeedGuideRolePermissions1749902400000`
4. `CreateGuideItemConfigTable1749910800000`
5. `SeedGuideItemPermissions1749914400000`
6. `SeedGuideItemRolePermissions1749918000000`
7. `CreateGuideApiCacheTable1749921600000`

执行结果：

- 7 个迁移在事务中成功提交
- `migration:show` 显示 14 个迁移全部完成
- 再次执行 `migration:run` 返回 `No migrations are pending`

---

## 四、结构验证

已创建：

- `guide_dept_mapping`
- `guide_theme_mapping`
- `guide_item_config`
- `guide_api_cache`

验证结果：

- 主键均为 `varchar(36)`
- 无自增主键
- 布尔标记使用 `smallint`
- JSON 配置及缓存正文使用 `text`
- 业务配置表包含 `created_at`、`updated_at`、`deleted_at`
- 缓存表包含 `created_at`、`updated_at`
- 编码及缓存键唯一索引存在
- 未使用数据库 ENUM、JSON 类型、触发器或存储过程
- 符合当前 MySQL 8 / HighGo 兼容设计

权限数据：

- guide 权限：12 条
- guide 角色权限关联：12 条

---

## 五、缓存验证

调用事项列表和事项详情后：

- `guide_api_cache` 成功写入 2 条记录
- 缓存写入未影响公开接口响应
- 缓存表和唯一键可正常使用

失败回退、损坏缓存及并发写入行为由 Step 12 自动化测试覆盖。

---

## 六、HTTP 运行验收

后端监听：

- `0.0.0.0:3100`

公开接口：

| 接口 | 结果 |
|---|---|
| `GET /api/public/service-guide/depts` | HTTP 200，空配置返回 `[]` |
| `GET /api/public/service-guide/themes` | HTTP 200，空配置返回 `[]` |
| `GET /api/public/service-guide/items?page=1&pageSize=2` | HTTP 200，事项 `i-001`、`i-002`，`total=6` |
| `GET /api/public/service-guide/items?page=2&pageSize=2` | HTTP 200，事项 `i-003`、`i-004`，`total=6` |
| `GET /api/public/service-guide/items?page=3&pageSize=2` | HTTP 200，事项 `i-005`、`i-006`，`total=6` |
| `GET /api/public/service-guide/items?page=4&pageSize=2` | HTTP 200，`list=[]`，`total=6` |
| `GET /api/public/service-guide/items/i-001` | HTTP 200，统一详情 DTO |
| `GET /api/public/service-guide/items/not-exists` | HTTP 404 |

接口分层：

- 未登录访问 `GET /api/admin/guide/depts` 返回 HTTP 401
- Public API 保持匿名只读
- 未暴露后台字段、缓存正文或共享平台参数

远程访问：

- `http://10.217.19.22:3100` 可访问
- `http://10.217.19.22:5183` 返回 HTTP 200
- `http://10.217.19.22:5184` 返回 HTTP 200

---

## 七、自动化验证

本次实际执行：

- `cd backend && npm run build`
- `cd backend && npm run type-check`
- `cd backend && npm test -- --runInBand`

结果：

- 构建通过
- 类型检查通过
- 后端测试：547 passed，35 skipped

---

## 八、验收结论

Step 12 开发环境数据库迁移和 HTTP 运行链路已完成验收：

- 专用数据库隔离正确
- 迁移完整且可重复检查
- 表结构符合数据库基线
- Public/Admin 接口分层正确
- 分页和详情链路可运行
- 本机及远程访问正常

仍保留的后续风险：

- 当前事项数据为明确标记的 development mock 示例数据
- 部门和主题配置表尚无业务配置
- 真实共享平台协议、凭据和测试环境尚未提供
- `fetchItemListScope` 的全量 scope 方案不得直接作为生产 Real Provider 实现
- 生产 HighGo 实连迁移仍需在正式环境部署前验证

在正式共享平台资料到位前，不得声称已完成真实平台对接。
