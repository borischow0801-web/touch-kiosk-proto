# 031 · Step 9 Phase 3 内容审核发布状态矩阵最终收尾

**交付日期**：2026-06-15  
**基于**：030-step9-admin-content-publish-closure.md  
**状态**：✅ 完成（未进入首页配置、办事指南或其他模块）

---

## 一、rejected 为何不能在列表判断

主表 `item.status = rejected` 仅表示**上一次审核被驳回**，不能证明：

- 用户是否已重新编辑并生成新的 `draft` 版本
- 当前应操作哪个 `versionId`

若在列表展示「提交审核 / 直接发布」，用户可能在**尚无新 draft** 时误点，只能依赖后端 409 兜底——不符合验收要求。

**修复**：`rejected` 列表仅保留「发布记录」等确定可用操作；用户编辑产生新 draft 后，在**版本页**对最新 draft 执行提交/直接发布（显式 `versionId`）。

---

## 二、修复后列表状态矩阵

| `item.status` | 可见操作（需对应权限） |
|---|---|
| `draft` | 提交审核、直接发布 |
| `pending` | 审核通过、审核驳回 |
| `published` | 撤回 |
| `rejected` | **仅发布记录** |
| `withdrawn` | 仅发布记录 |
| `archived` | 仅发布记录 |

---

## 三、版本状态与版本操作矩阵

判断逻辑集中在 `publishActions.ts`（`canShowVersionPublishAction` / `getVersionWorkflowWarning`）。

| 版本条件 | 可见操作 |
|---|---|
| 无 pending + 最新 draft（`versionNo` 最大） | 提交审核、直接发布 |
| 非最新 draft | 无提交/直接发布 |
| **存在任意 pending** | **所有 draft** 均不显示提交/直接发布 |
| 恰好 1 个 pending | 该 pending 行：审核通过、审核驳回 |
| 2+ 个 pending（异常） | **不显示**审核按钮；页面 warning 提示 |
| `published` / `withdrawn` | 回滚（逻辑不变） |

### pending 与 draft 并存

典型场景：已发布内容有新 draft 同时另有 pending 修订。此时：

- draft 行**不显示**提交/直接发布（须先处理 pending）
- pending 行显示审核通过/驳回

### 多 pending 异常展示

```text
存在多个待审核版本，数据异常，无法审核。请联系管理员处理。
```

`ContentItemVersionsPage` 通过 `getVersionWorkflowWarning()` 绑定 `el-alert`，**不尝试前端修复数据**。

---

## 四、versionId 传递与五种操作测试

版本页所有写操作请求体均含 `versionId`（撤回仅在列表页，作用于当前生效版本，无 versionId）。

| 操作 | 测试用例 | 断言 |
|---|---|---|
| 提交审核 | `版本提交审核请求携带 versionId` | `{ versionId: 'ver-draft' }` |
| 直接发布 | `版本直接发布请求携带 versionId` | `{ versionId: 'ver-draft' }` |
| 审核通过 | `版本审核通过请求携带 versionId 和 comment` | `{ versionId, comment }` |
| 审核驳回 | `版本审核驳回请求携带 versionId 和 comment` | `{ versionId, comment }` |
| 回滚 | `版本回滚携带 versionId 且提示已创建新草稿` | `{ versionId: 'ver-pub' }` |

另覆盖：驳回空意见不发请求、409/403 后端原文、成功后 `loadVersions()`、防重复点击。

---

## 五、实际修改文件

| 文件 | 说明 |
|---|---|
| `admin-web/src/utils/publishActions.ts` | rejected 列表收紧；pending/draft 并存与多 pending 规则 |
| `admin-web/src/pages/content/ContentItemVersionsPage.vue` | 多 pending 异常 `el-alert` |
| `admin-web/tests/publish.actions.spec.ts` | 矩阵单元测试（16 用例） |
| `admin-web/tests/content.publish.components.spec.ts` | 真实组件测试扩展（29 用例） |
| `CLAUDE.md` | 更新 admin-web 状态 |
| `docs/dev-logs/031-step9-admin-content-publish-matrix-closure.md` | 本报告 |

**未修改**：`backend/**`、`kiosk-app/**`、数据库/迁移/种子、`deploy/**`、端口与环境配置。

---

## 六、验证命令及结果

### admin-web

```bash
cd admin-web
npm run type-check   # exit 0
npm run build        # exit 0
npm test             # 18 files, 129 tests passed, exit 0（第一次）
npm test             # 18 files, 129 tests passed, exit 0（第二次）
```

stderr 无 Vue / Router / Element Plus 重复安装类警告。

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

## 七、警告、失败与未完成项

| 项 | 说明 |
|---|---|
| 测试失败 | **无** |
| Vite chunk 体积提示 | 构建警告，非本阶段引入 |
| 操作人姓名 | 发布记录仍仅 `operatorId` |
| 其他模块 | **未启动** |

---

## 八、跨工程变更声明

| 工程 | 是否修改 |
|---|---|
| `admin-web/` | **是** |
| `backend/` | **否** |
| `kiosk-app/` | **否** |
| 数据库 | **否** |
| `deploy/` | **否** |
| 端口 | **否** |

**数据库访问**：未执行任何 SQL。
