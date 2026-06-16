# 063 · Step 14B-8f 首页配置 E2E 验收小闭环

**交付日期**：2026-06-16  
**基于**：062-step14b8e-home-config-e2e-final.md、docs/review-rules.md  
**执行方**：Cursor  
**状态**：**通过**（backend 边界修复 + 单测；真实 login 未执行）

---

## 一、执行范围

针对 062 遗留的 **撤回后恢复发布** 边界风险做 backend 修复与单测补强；尝试补真实 login 验收。

**未进入 UI 视觉设计**；**未实现**二期功能；**未操作** `oms_db` / `mydb`；**未修改** database/architecture/api-spec 基线文档；**未执行**迁移/建库/授权。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `backend/src/home-config/home-config.service.ts` | `findLatestCopySourceVersion` 模块优先选择逻辑 |
| `backend/test/home-config.service.spec.ts` | 新增 3 项边界单测；mock 增加 `count` |
| `docs/dev-logs/063-step14b8f-home-config-e2e-closure.md` | 本报告 |

---

## 三、边界风险修复说明

### 3.1 问题（062 遗留）

`findLatestCopySourceVersion` 仅按 `versionNo` 倒序取第一个 `published`/`withdrawn` 版本。若 **最新 withdrawn 版本为空 draft 误发布**（无 `home_module`），而更早版本含模块，则撤回后 `PUT` 新建 draft 会复制 **空版本**，导致恢复发布后 Public API `modules=[]`。

### 3.2 修复策略

`createDraftFromContext` 行为保持不变：

| 条件 | 行为 |
|---|---|
| `currentVersionId` **存在** | 仍复制 `currentVersionId` 指向版本（不变） |
| `currentVersionId` **为空** | 调用增强后的 `findLatestCopySourceVersion` |

`findLatestCopySourceVersion` 新逻辑：

1. 列出同一 `home_config_id` 下全部版本，按 `versionNo` **降序**。
2. 筛选 `status ∈ {published, withdrawn}` 为候选。
3. **优先**返回候选中 **第一个**（最新）存在未删除 `home_module`（`manager.count`）的版本。
4. 若所有候选均无模块，**回退**到候选列表首项（最新 published/withdrawn），创建 **空 draft**，不抛错。

实现使用标准 TypeORM `find` / `count`，无 JSON 操作符、存储过程或 MySQL 专属函数，兼容 MySQL 8 / HighGo。

---

## 四、新增测试说明

文件：`backend/test/home-config.service.spec.ts`

| # | 用例 | 断言 |
|---|---|---|
| 1 | 最新 withdrawn（v2）无模块，更早 published（v1）有模块 | 新 draft 复制 **v1** 的模块 |
| 2 | 全部 published/withdrawn 候选无模块 | `updateAdminConfig` **不报错**；draft 模块数为 0 |
| 3 | `currentVersionId` 指向空 published（v2），更早 withdrawn（v1）有模块 | 新 draft 复制 **v2**（空），**不**采用 v1 |

mock `EntityManager` 新增 `count`，与 `find` 一致排除 `deletedAt` 模块。

---

## 五、构建 / 测试结果

| 命令 | 结果 |
|---|---|
| `cd backend && npm run build` | **通过** |
| `cd backend && npm test -- --runInBand` | **通过** — 659 passed（+3 相对 062） |
| `git diff --check` | **通过** |

未修改 admin-web / kiosk-app，未追加对应构建。

---

## 六、真实 login 验收

### 6.1 环境变量探测

| 变量 | 状态 |
|---|---|
| `E2E_CONTENT_EDITOR_PASSWORD` | **未设置** |
| `E2E_PUBLISH_REVIEWER_PASSWORD` | **未设置** |
| `E2E_SUPER_ADMIN_PASSWORD` | **未设置** |

### 6.2 执行情况

**未执行** 真实 login 验收。

**原因**：运行环境未注入上述 `E2E_*` 变量；按任务要求 **未使用** development JWT 或任何伪造 Token 替代 `POST /api/admin/auth/login`。

### 6.3 待环境就绪后补测项

- `content_editor` login → submit **200**
- `content_editor` approve → **403**
- `publish_reviewer` login → approve **200**
- `publish_reviewer` `PUT /api/admin/home/config` → **403**

062 主链路（dev JWT 路径）结论不变；真实 login 补测完成后可将 login 验收项单独标记为通过。

---

## 七、未完成事项

| 项 | 说明 |
|---|---|
| 真实 login 四场景 | 待 `E2E_*` 注入后补测 |
| 浏览器 Network 截屏 | 062 已记录；本步未重复 |
| 直接发布 / 驳回 / 二次撤回 | 非本步范围 |

---

## 八、是否进入 UI 设计 / 二期 / 数据库基线

| 项 | 结果 |
|---|---|
| UI 视觉设计 | **否** |
| 二期功能 | **否** |
| 修改 database.md / architecture.md / api-spec.md | **否** |

---

## 九、结论

- ☑ **通过** — 撤回后恢复发布的 **模块复制边界** 已修复并有单测覆盖；backend 构建与全量测试通过。
- ☐ **有条件通过**
- ☐ **不通过**

**说明**：本步 **backend 修复目标已完成**。真实 login 因 `E2E_*` 未注入 **按规未执行**，不构成本步 backend 修复的不通过项；建议在 CI/联调环境注入凭据后补一轮 login 验收并更新 dev-log。
