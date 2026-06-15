# 029 · Step 9 Phase 3 管理端内容审核发布

**交付日期**：2026-06-12  
**基于**：028-step9-admin-content-acceptance-closure.md  
**状态**：✅ 完成（仅 admin-web 接入，未进入其他新模块）

---

## 一、本阶段目标

在 `admin-web` 接入后端已实现的 content 审核发布接口，不新增或修改后端发布流程、数据库及群众端。

---

## 二、实际修改文件

| 文件 | 说明 |
|---|---|
| `admin-web/src/api/publish/types.ts` | **新增** 发布 DTO 类型（对齐后端） |
| `admin-web/src/api/publish/content.ts` | **新增** 7 个发布 API 封装 |
| `admin-web/src/constants/publish.ts` | **新增** 操作/权限/中文标签 |
| `admin-web/src/utils/publishActions.ts` | **新增** 状态×操作可见性矩阵 |
| `admin-web/src/components/publish/PublishCommentDialog.vue` | **新增** 意见表单对话框 |
| `admin-web/src/components/publish/PublishRecordsDialog.vue` | **新增** 发布记录对话框 |
| `admin-web/src/composables/usePermission.ts` | 扩展 7 个发布权限 computed |
| `admin-web/src/pages/content/ContentItemListPage.vue` | 列表发布操作、确认、防重复 |
| `admin-web/src/pages/content/ContentItemVersionsPage.vue` | 版本回滚 |
| `admin-web/tests/publish.api.spec.ts` | **新增** API 契约测试 |
| `admin-web/tests/publish.actions.spec.ts` | **新增** 状态矩阵测试 |
| `admin-web/tests/content.publish.components.spec.ts` | **新增** 列表/版本/记录组件测试 |
| `admin-web/tests/helpers/publishTest.ts` | **新增** 发布测试 mount 辅助 |
| `admin-web/tests/content.permissions.spec.ts` | 补充发布权限用例 |
| `CLAUDE.md` | 更新 admin-web 状态 |
| `docs/dev-logs/029-step9-admin-content-publish.md` | 本报告 |

**未修改**：`backend/**`、`kiosk-app/**`、数据库/迁移/种子、`deploy/**`、端口与环境配置。

---

## 三、发布操作与状态权限矩阵

### 3.1 权限码（与后端 `@RequirePermissions` 一致）

| 操作 | 权限码 |
|---|---|
| 提交审核 | `publish:submit` |
| 审核通过 | `publish:approve` |
| 审核驳回 | `publish:reject` |
| 直接发布 | `publish:direct-publish` |
| 撤回 | `publish:withdraw` |
| 查看发布记录 | `publish:record:read` |
| 版本回滚 | `publish:rollback` |

无对应权限时**不渲染**操作按钮；后端 403 通过 `ApiError` 展示文案。

### 3.2 列表页按钮可见性（按 `item.status`）

| 状态 | 提交审核 | 审核通过 | 审核驳回 | 直接发布 | 撤回 | 发布记录 |
|---|---|---|---|---|---|---|
| `draft` | ✅ | — | — | ✅ | — | ✅* |
| `pending` | — | ✅ | ✅ | — | — | ✅* |
| `published` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* |
| `rejected` | ✅ | — | — | ✅ | — | ✅* |
| `withdrawn` | ✅ | — | — | ✅ | — | ✅* |
| `archived` | — | — | — | — | — | ✅* |

\* 需 `publish:record:read` 权限。

说明：`published` 状态可能存在新 draft / pending 版本（列表无版本明细），按钮保守展示，非法流转由后端 **409** 返回明确文案。

### 3.3 版本页回滚

| 条件 | 说明 |
|---|---|
| 权限 | `publish:rollback` |
| 可回滚版本状态 | `published`、`withdrawn` |
| 请求 | `POST .../rollback` body `{ versionId, comment? }` |
| 成功提示 | **「已创建新的草稿版本」**（不描述为覆盖历史） |
| 确认信息 | 展示版本号、状态、创建时间 |

---

## 四、请求字段与后端 DTO 对应

| 前端 API | HTTP | Body 类型 | 字段 |
|---|---|---|---|
| `submitContentPublishApi` | `POST /publish/content/:bizId/submit` | `PublishActionDto` | `versionId?`, `comment?` |
| `approveContentPublishApi` | `POST .../approve` | `PublishActionDto` | `versionId?`, `comment?` |
| `rejectContentPublishApi` | `POST .../reject` | `PublishActionDto` | `versionId?`, `comment?` |
| `directPublishContentApi` | `POST .../direct-publish` | `PublishActionDto` | `versionId?`, `comment?` |
| `withdrawContentPublishApi` | `POST .../withdraw` | `PublishCommentDto` | `comment?` |
| `rollbackContentPublishApi` | `POST .../rollback` | `RollbackDto` | `versionId`（必填）, `comment?` |
| `fetchContentPublishRecordsApi` | `GET .../records` | — | — |

`bizType` 固定为 `content`（与 `SUPPORTED_BIZ_TYPES` 一致）。

响应 `PublishActionResult` / `PublishRecordItem` 字段与 `backend/src/publish/content-publish.service.ts` 导出接口一致。

---

## 五、测试命令及结果

### admin-web

```bash
cd admin-web
npm run type-check   # exit 0
npm run build        # exit 0
npm test             # 18 files, 107 tests passed, exit 0（第一次）
npm test             # 18 files, 107 tests passed, exit 0（第二次）
```

新增测试覆盖：状态按钮显隐、分权限控制、提交后刷新、各 POST 路径/请求体、409/403 文案、防重复点击、发布记录展示、回滚 versionId 与成功提示、无发布权限无按钮。

测试 stderr **无** Vue/Router/Element Plus 重复安装类警告（仅 npm 环境 `devdir` 提示）。

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

### 远程 IP 验证

```bash
curl --noproxy '*' http://10.217.19.22:5183/                        # HTTP 200
curl --noproxy '*' http://10.217.19.22:5183/api/public/home/config  # HTTP 200
curl --noproxy '*' http://10.217.19.22:5184/login                    # HTTP 200
curl --noproxy '*' http://10.217.19.22:3100/api/admin/auth/profile  # HTTP 401
```

---

## 六、未完成事项与限制

| 项 | 说明 |
|---|---|
| 列表页版本维度 | 列表接口不返回 pending/draft 版本标志，已发布内容的「提交/审核」按钮依赖 status 保守推断 + 后端 409 |
| 批量发布 | 未实现（后端无批量接口，符合要求） |
| 操作人姓名 | 发布记录仅展示 `operatorId`（后端 `PublishRecordItem` 无姓名字段） |
| Vite chunk 体积 | 构建提示 >500kB，非本阶段引入 |
| 首页配置 / 办事指南 | **本阶段未启动** |

**后端阻塞**：无。现有 7 个发布接口可满足前端需求，未修改 backend。

---

## 七、跨工程变更声明

| 工程 | 是否修改 |
|---|---|
| `admin-web/` | **是** |
| `backend/` | **否** |
| `kiosk-app/` | **否** |
| 数据库 | **否** |
| 端口 / deploy | **否** |

**数据库访问**：未执行任何 SQL，未连接任何项目数据库。
