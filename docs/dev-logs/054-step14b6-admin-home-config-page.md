# 054 · Step 14B-6 管理端首页配置页面

**交付日期**：2026-06-16  
**基于**：053-step14b5-public-home-config.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

在 admin-web 实现首页配置管理页面，调用已完成的后端 Admin Home API 与通用发布 API（`bizType=home_config`）。

**未修改**：backend、kiosk-app、deploy、基线文档、Entity、Migration、环境配置。

**未连接或操作**任何数据库。

---

## 二、修改文件清单

### API 与工具

| 文件 | 说明 |
|---|---|
| `admin-web/src/api/home/types.ts` | 首页配置与模块类型定义 |
| `admin-web/src/api/home/config.ts` | GET/PUT `/home/config` |
| `admin-web/src/api/home/modules.ts` | 模块 CRUD + sort |
| `admin-web/src/api/publish/homeConfig.ts` | 发布 API（`bizType=home_config`） |
| `admin-web/src/constants/home.ts` | 状态标签、模块/目标类型选项 |
| `admin-web/src/utils/homeForm.ts` | JSON 解析、排序校验、发布状态推断 |
| `admin-web/src/utils/homePublishActions.ts` | 发布按钮可见性规则 |

### 页面与布局

| 文件 | 说明 |
|---|---|
| `admin-web/src/pages/home/HomeConfigPage.vue` | 首页配置管理主页面 |
| `admin-web/src/router/index.ts` | 路由 `/home/config` |
| `admin-web/src/layouts/AdminLayout.vue` | 侧边栏「首页配置」菜单 |
| `admin-web/src/composables/usePermission.ts` | `home:*` 权限 computed |
| `admin-web/src/components/publish/PublishRecordsDialog.vue` | 支持 `bizType=home_config` |

### 测试

| 文件 | 说明 |
|---|---|
| `admin-web/tests/home.api.spec.ts` | API 路径与 bizType 测试（14） |
| `admin-web/tests/home.form.spec.ts` | JSON 解析与发布规则测试（5） |
| `admin-web/tests/home.routes.spec.ts` | 路由权限守卫（2） |
| `admin-web/tests/home.permissions.spec.ts` | 菜单与按钮权限（4） |
| `admin-web/tests/home.components.spec.ts` | 页面交互测试（8） |
| `admin-web/tests/helpers/homeTest.ts` | 测试辅助函数 |

### 交付报告

| 文件 | 说明 |
|---|---|
| `docs/dev-logs/054-step14b6-admin-home-config-page.md` | 本报告 |

---

## 三、页面功能说明

### 配置概览

- 显示主表 `status`、`currentVersion` 摘要（版本号、标题、状态）
- 显示 `draftVersion` 编辑表单：title、subtitle、topBannerJson、themeJson、changeRemark
- JSON 字段使用 textarea 编辑，保存前前端解析；非法 JSON 提示错误且不发送请求
- 保存调用 `PUT /api/admin/home/config`，防重复提交

### 模块管理

- 列表展示当前 draft 下模块
- 新增 / 编辑 / 删除（删除二次确认）
- `isVisible` 使用 `el-switch`，提交 **boolean**
- 表格内调整 `sortOrder`，「保存排序」调用 `PUT /home/modules/sort`
- 前端校验 items 中 id / sortOrder 不重复

### 发布操作

- 按主表状态 + 发布记录推断可用操作：
  - draft：提交审核、直接发布
  - pending / 最近 submit 记录：审核通过、驳回
  - published：撤回、版本回滚
  - withdrawn / rejected：有 draft 时可继续提交
- 驳回需填写意见；撤回 / 审核通过可选意见
- 发布后刷新配置、模块、发布记录
- 「发布记录」对话框只读展示 action、fromStatus、toStatus、comment、operatorId、operatedAt

---

## 四、API 调用清单

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/admin/home/config` | 加载配置 |
| PUT | `/api/admin/home/config` | 保存草稿 |
| GET | `/api/admin/home/modules` | 模块列表 |
| POST | `/api/admin/home/modules` | 新增模块 |
| PUT | `/api/admin/home/modules/sort` | 保存排序 |
| PUT | `/api/admin/home/modules/:id` | 更新模块 |
| DELETE | `/api/admin/home/modules/:id` | 删除模块 |
| POST | `/api/admin/publish/home_config/:bizId/submit` | 提交审核 |
| POST | `/api/admin/publish/home_config/:bizId/approve` | 审核通过 |
| POST | `/api/admin/publish/home_config/:bizId/reject` | 驳回 |
| POST | `/api/admin/publish/home_config/:bizId/direct-publish` | 直接发布 |
| POST | `/api/admin/publish/home_config/:bizId/withdraw` | 撤回 |
| POST | `/api/admin/publish/home_config/:bizId/rollback` | 回滚 |
| GET | `/api/admin/publish/home_config/:bizId/records` | 发布记录 |

---

## 五、权限控制说明

| 权限码 | 页面能力 |
|---|---|
| `home:config:read` | 路由访问、菜单展示、读取配置 |
| `home:config:update` | 保存草稿 |
| `home:module:read` | 模块列表 |
| `home:module:create` | 新增模块 |
| `home:module:update` | 编辑模块 |
| `home:module:delete` | 删除模块 |
| `home:module:sort` | 保存排序 |
| `publish:submit` / `approve` / `reject` / `direct-publish` / `withdraw` / `rollback` | 对应发布按钮 |
| `publish:record:read` | 发布记录 |

无 `home:config:read` 时路由跳转 `/forbidden`，菜单不展示入口（与 content / guide 模式一致）。

---

## 六、发布操作说明

- `bizId` 使用 `home_config.id`（页面加载后从 GET config 获取）
- 发布流程与 content 列表页对齐：submit / directPublish 直接确认；reject 必填意见；approve / withdraw 可选意见
- 主表 `published` 且存在 pending 版本时，通过发布记录最近一条 `submit→pending` 推断，显示审核按钮
- 回滚需输入历史 `versionId`（默认填充当前发布版本 id）

---

## 七、测试结果

```bash
git diff --check          # 通过
cd admin-web && npm test -- --run
# Test Files: 28 passed
# Tests:       193 passed

cd admin-web && npm run build
# ✓ built in 7.56s
```

另有 `npm run type-check` 脚本（`vue-tsc --noEmit`），本阶段以 test + build 通过为准。

### 回归

- auth、content、guide、publish 既有测试全部通过（193 total）

---

## 八、声明

- **未修改** backend、kiosk-app、deploy、基线文档、数据库
- **未连接或操作**任何数据库

---

## 九、下一步建议

1. **后端真实迁移环境验收**：执行 home_config 迁移，通过管理端完成配置创建 → 模块编辑 → 发布 → 验证 Public Home API
2. **kiosk-app 对接**：将首页从 mock/离线兜底切换为 `GET /api/public/home/config` 真实数据（HTTP 503 时继续本地离线配置）
