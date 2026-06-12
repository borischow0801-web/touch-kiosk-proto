# 017 · Step 6 PublishModule 状态机验收收口

**交付日期**：2026-06-12  
**基于**：016-step6-publish-module.md  
**状态**：✅ 完成

---

## 一、任务目标

收紧 `content` 发布状态机版本约束，补齐边界与并发测试，在专用测试库 `touch_kiosk_test` 上完成验收。

**数据库环境**：仅使用 `backend/.env` 中 `MYSQL_TEST_*` 配置连接 `touch_kiosk_test`；未访问 `oms_db`、未修改 `touch_kiosk_test_guard`、未执行任何建库/删库/授权操作。

---

## 二、修改文件

| 文件 | 变更 |
|---|---|
| `backend/src/publish/content-publish.service.ts` | 版本解析与 pending/draft 约束 |
| `backend/test/publish.spec.ts` | 单元测试：重复提交、旧草稿、多 pending、矩阵、记录失败 |
| `backend/test/publish-mysql-integration.spec.ts` | MySQL 集成：并发、异常数据、事务回滚 |

---

## 三、状态机约束（收口后）

### 单 pending 原则

- 同一 `content_item` 同一时间最多 **1** 个 `pending` 版本。
- `submit` / `direct-publish` 前检查：若已有 `pending` → **409**（`已存在待审核版本，无法提交或直接发布`）。

### 最新 draft 原则

- `submit` / `direct-publish`（含显式 `versionId`）只能操作该内容 **version_no 最大** 的 `draft` 版本。
- 提交旧 draft → **409**（`只能操作该内容最新的 draft 版本`）。
- 非 draft 版本不可提交/直接发布 → **409**。

### approve / reject 版本解析

| versionId | 行为 |
|---|---|
| 未传 | pending 数量 = 0 → **409**；= 1 → 处理该版本；> 1 → **409**（`存在多个待审核版本，请指定 versionId`） |
| 显式传入 | 必须属于当前 content；须为 `pending`（否则 **409**）；多 pending 时允许指定其中一个 |

### 不变项

- 所有写操作仍在 **同一事务** 内完成。
- `content_item` 继续使用 **`pessimistic_write`** 行锁。
- 每次成功操作仍写入 `publish_record`；失败整体回滚。

---

## 四、新增测试场景

### 单元（`publish.spec.ts`）

| 场景 | 结果 |
|---|---|
| 重复 submit | ✅ 409 |
| 提交旧 draft（显式 versionId） | ✅ 409 |
| pending 期间 direct-publish | ✅ 409 |
| 多 pending 未传 versionId approve | ✅ 409 |
| 无 pending approve | ✅ 409 |
| publish_record 写入失败 | ✅ 异常抛出 |
| 非法状态流转矩阵（reject/withdraw/direct-publish） | ✅ 4 项 |

### MySQL 集成（`publish-mysql-integration.spec.ts`，`touch_kiosk_test`）

| 场景 | 结果 |
|---|---|
| 重复 submit | ✅ |
| 提交旧 draft | ✅ |
| pending 期间 submit + direct-publish | ✅ |
| 多 pending 异常数据 approve | ✅ |
| 并发双 submit（最多 1 成功） | ✅ |
| 并发 submit + direct-publish（最多 1 成功） | ✅ |
| publish_record 写入失败无 pending 残留 | ✅ |
| 原有发布链路 / 并发 approve 用例 | ✅ 保持通过 |

---

## 五、已执行验证命令

```bash
cd backend
npm run type-check    # ✅
npm run build         # ✅
npm test -- --runInBand                    # ✅ 317 passed, 27 skipped
npm run test:integration:mysql:serial      # ✅ 27 passed
```

**说明**：未设置 `RUN_MYSQL_*` 时，5 个 MySQL 集成套件共 **27** 项跳过；串行集成命令启用全部标志后 **27** 项全部通过。

---

## 六、数据库访问确认

| 项 | 结论 |
|---|---|
| 开发库 | 未对 `touch_kiosk_dev` 执行破坏性操作 |
| 测试库 | 仅通过 `MYSQL_TEST_*` 连接 `touch_kiosk_test` |
| `oms_db` | **未访问** |
| `touch_kiosk_test_guard` | **未修改** |
| 密码/凭据 | 报告中 **未记录** |

---

## 七、未完成事项与风险

| 项 | 说明 |
|---|---|
| 数据库层唯一 pending 约束 | 当前靠应用层事务 + 悲观锁；异常数据（多 pending）靠 approve 拒绝，未加 DB 部分唯一索引 |
| 全量 item×version 非法矩阵 HTTP 用例 | 单元/集成覆盖主路径，未穷举所有组合 |
| HighGo 实连 | 未在真实 HighGo 上复跑发布链路 |
| 群众端 Public API | 未实现 withdrawn 过滤展示 |

---

## 八、下一步建议

1. Public API 仅返回 `published` 且 `current_version_id` 指向的版本。
2. admin-web 发布操作 UI，按权限显隐。
3. 视需要在 `content_version` 上增加「每 content 至多一个 pending」的部分唯一索引（需评估 HighGo 兼容性）。
