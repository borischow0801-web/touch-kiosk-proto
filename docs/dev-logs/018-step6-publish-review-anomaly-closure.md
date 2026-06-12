# 018 · Step 6 PublishModule 多 pending 异常处理收口

**交付日期**：2026-06-12  
**基于**：017-step6-publish-state-machine-closure.md  
**状态**：✅ 完成

---

## 一、问题背景

`resolveVersionForReview` 在显式传入 `versionId` 时跳过 pending 数量检查，导致存在多个 `pending` 的异常数据仍可通过指定版本执行 `approve`/`reject`。

---

## 二、修改文件

| 文件 | 变更 |
|---|---|
| `backend/src/publish/content-publish.service.ts` | 重写 `resolveVersionForReview`：始终先查全部 pending |
| `backend/test/publish.spec.ts` | 单元测试：多 pending 显式 versionId、单 pending 显式校验 |
| `backend/test/publish-mysql-integration.spec.ts` | MySQL 集成：异常数据拒绝 + 失败时状态快照不变 |

---

## 三、最终版本解析规则（approve / reject）

无论是否传入 `versionId`，均先查询当前 content 的全部 `pending` 版本：

| pending 数量 | 行为 |
|---|---|
| 0 | **409** `没有待审核的 pending 版本` |
| > 1 | **409** `存在多个待审核版本，数据异常，无法审核`（禁止处理任一版本，含显式 versionId） |
| = 1 且未传 versionId | 处理唯一待审版本 |
| = 1 且传入 versionId | versionId 须属于当前 content；须等于唯一 pending；否则 **404**（版本不存在）或 **409**（`指定版本不是当前待审核版本`） |

**不变项**：事务包裹、`content_item` 悲观写锁、`publish_record` 与业务同事务写入；未增加数据库部分唯一索引。

---

## 四、新增测试场景

### 单元（`publish.spec.ts`）

| 场景 | 结果 |
|---|---|
| 多 pending + 显式 versionId + approve | ✅ 409 |
| 多 pending + 显式 versionId + reject | ✅ 409 |
| 单 pending + 正确显式 versionId approve | ✅ 成功 |
| 单 pending + 非待审 versionId approve | ✅ 409 |
| 多 pending 未传 versionId（消息更新） | ✅ 409 |

### MySQL 集成（`touch_kiosk_test`）

| 场景 | 结果 |
|---|---|
| 多 pending 未传 versionId approve，状态不变 | ✅ |
| 多 pending + 显式 versionId approve，状态不变 | ✅ |
| 多 pending + 显式 versionId reject，状态不变 | ✅ |
| 单 pending + 正确显式 versionId approve | ✅ |
| 单 pending + 非待审 versionId approve，状态不变 | ✅ |

失败用例均通过 `snapshotReviewState` 确认 `content_item`、`content_version`、`publish_record` 无变化。

---

## 五、已执行验证命令

```bash
cd backend
npm run type-check                    # ✅
npm run build                         # ✅
npm test -- --runInBand               # ✅ 321 passed, 31 skipped
npm run test:integration:mysql:serial # ✅ 31 passed
```

---

## 六、数据库访问确认

| 项 | 结论 |
|---|---|
| 测试库 | 仅通过 `backend/.env` 中 `MYSQL_TEST_*` 连接 `touch_kiosk_test` |
| `oms_db` / `mydb` | **未访问** |
| 建库/删库/授权/恢复 | **未执行** |
| `touch_kiosk_test_guard` | **未修改** |
| 密码/凭据 | 报告中 **未记录** |

---

## 七、未完成风险

| 项 | 说明 |
|---|---|
| 数据库层 pending 唯一约束 | 仍依赖应用层事务 + 悲观锁；异常多 pending 仅拒绝审核，不自动修复数据 |
| HighGo 实连 | 未在真实 HighGo 上复跑审核异常路径 |
| 群众端 / 管理端 | 本阶段未改动 |
