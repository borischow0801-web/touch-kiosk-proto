# 030 · Step 9 Phase 3 内容审核发布验收收尾

**交付日期**：2026-06-12  
**基于**：029-step9-admin-content-publish.md  
**状态**：✅ 完成（未进入首页配置、办事指南或其他模块）

---

## 一、029 中错误的按钮矩阵

029 在列表页对 `published` / `withdrawn` 采用「保守展示」策略，导致：

| 问题 | 029 行为 | 问题本质 |
|---|---|---|
| `published` | 同时显示提交、通过、驳回、直接发布、撤回 | 列表无版本工作流信息，无法确认这些操作是否有效 |
| `withdrawn` | 显示提交、直接发布 | 主表 status 不能推断是否存在可提交 draft |
| 409 兜底 | 依赖后端冲突提示代替按钮可用性 | 不符合验收要求 |

**正确做法**：列表仅展示由 `item.status` **可确定**的操作；版本级工作流操作移至版本页，并显式传 `versionId`。

---

## 二、修复后列表状态矩阵

| `item.status` | 可见操作（需对应权限） |
|---|---|
| `draft` | 提交审核、直接发布 |
| `pending` | 审核通过、审核驳回 |
| `published` | **撤回** |
| `rejected` | 提交审核、直接发布 |
| `withdrawn` | **无**（仅可有发布记录） |
| `archived` | **无**（仅可有发布记录） |
| 任意状态 | 发布记录（`publish:record:read`） |

`published` **不再**显示提交审核、直接发布、审核通过、审核驳回。

---

## 三、版本状态与版本操作矩阵

| 版本 `status` | 附加条件 | 可见操作 |
|---|---|---|
| `draft` | `versionNo` = 全部 draft 中最大 | 提交审核、直接发布 |
| `draft` | 非最新 draft | **无**发布操作 |
| `pending` | — | 审核通过、审核驳回 |
| `published` | — | 回滚 |
| `withdrawn` | — | 回滚 |
| `rejected` 等 | — | **无**（除查看） |

实现函数：`getLatestDraftVersionNo`、`canShowVersionPublishAction`、`versionPublishActionsForRow`（`publishActions.ts`）。

---

## 四、versionId 传递方式

| 场景 | 请求体 |
|---|---|
| 列表页 `draft` / `pending` / `rejected` 操作 | 不传 `versionId`，由后端解析最新 draft / 唯一 pending |
| 列表页 `published` 撤回 | `PublishCommentDto`：`{ comment? }`（作用于当前生效版本） |
| **版本页** 提交 / 直接发布 / 通过 / 驳回 | `PublishActionDto`：`{ versionId, comment? }`，**始终携带当前行 versionId** |
| **版本页** 回滚 | `RollbackDto`：`{ versionId, comment? }` |

---

## 五、交互与防重复

- 提交审核、直接发布：`ElMessageBox.confirm` 二次确认
- 审核通过：可选意见对话框；驳回：意见**必填**
- 回滚：确认框展示版本号、原始 status、创建时间 + 可选说明
- 操作期间：`publishingId` / `publishingVersionId` 锁定，`commentDialogBusy` 防止对话框重复确认
- 成功后：列表 `loadList()` / 版本页 `loadVersions()`

---

## 六、实际修改文件

| 文件 | 说明 |
|---|---|
| `admin-web/src/utils/publishActions.ts` | 修正列表矩阵；新增版本级矩阵函数 |
| `admin-web/src/pages/content/ContentItemListPage.vue` | 收紧列表按钮；对话框 busy 状态 |
| `admin-web/src/pages/content/ContentItemVersionsPage.vue` | 版本级发布操作（含 versionId） |
| `admin-web/src/components/publish/PublishCommentDialog.vue` | `busy` 防重复确认 |
| `admin-web/tests/publish.actions.spec.ts` | 重写列表/版本矩阵测试 |
| `admin-web/tests/content.publish.components.spec.ts` | 扩展真实组件测试（21 用例） |
| `CLAUDE.md` | 更新 admin-web 状态 |
| `docs/dev-logs/030-step9-admin-content-publish-closure.md` | 本报告 |

**未修改**：`backend/**`、`kiosk-app/**`、数据库/迁移/种子、`deploy/**`、端口与环境配置。

---

## 七、验证命令及结果

### admin-web

```bash
cd admin-web
npm run type-check   # exit 0
npm run build        # exit 0
npm test             # 18 files, 119 tests passed, exit 0（第一次）
npm test             # 18 files, 119 tests passed, exit 0（第二次）
```

stderr 无 Vue / Router / Element Plus 重复安装类警告（仅 npm 环境 `devdir` 提示）。

### backend

```bash
cd backend
npm run type-check              # exit 0
npm test -- --runInBand         # 14 suites, 341 passed, exit 0
```

### kiosk-app

```bash
cd kiosk-app
npm run build                   # exit 0
npx vue-tsc --noEmit -p tsconfig.check.json  # exit 0
cd tests && npm test            # 17 files, 91 passed, exit 0
```

### 远程 IP

```bash
curl http://10.217.19.22:5183/                        # 200
curl http://10.217.19.22:5183/api/public/home/config  # 200
curl http://10.217.19.22:5184/login                    # 200
curl http://10.217.19.22:3100/api/admin/auth/profile  # 401
```

---

## 八、警告、失败与未完成项

| 项 | 说明 |
|---|---|
| 测试失败 | **无**（119 passed × 2） |
| Vite chunk >500kB | 构建提示，非本阶段引入 |
| 列表页版本级操作 | 已移至版本页，列表不再误展示 |
| 操作人姓名 | 发布记录仍仅 `operatorId`（后端字段限制） |
| 其他模块 | **未启动** |

---

## 九、跨工程变更声明

| 工程 | 是否修改 |
|---|---|
| `admin-web/` | **是** |
| `backend/` | **否** |
| `kiosk-app/` | **否** |
| 数据库 | **否** |
| `deploy/` | **否** |
| 端口 | **否** |

**数据库访问**：未执行任何 SQL。
