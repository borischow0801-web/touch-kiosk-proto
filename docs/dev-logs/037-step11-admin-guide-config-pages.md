# 037 · Step 11：admin-web 办事指南配置管理页面

**交付日期**：2026-06-15  
**基于**：036-step10-guide-item-config-acceptance-closure.md  
**状态**：✅ 完成（未进入群众端办事指南、共享平台真实对接）

---

## 一、修改文件

### 新增

| 路径 | 说明 |
|---|---|
| `admin-web/src/api/guide/types.ts` | 办事指南 API 类型定义 |
| `admin-web/src/api/guide/depts.ts` | 部门映射 API |
| `admin-web/src/api/guide/themes.ts` | 主题映射 API |
| `admin-web/src/api/guide/itemConfigs.ts` | 事项展示配置 API |
| `admin-web/src/constants/guide.ts` | 状态/可见性标签 |
| `admin-web/src/utils/guideForm.ts` | JSON 校验、UUID v4 校验 |
| `admin-web/src/components/guide/RelatedIdEditor.vue` | 关联 ID 标签编辑器 |
| `admin-web/src/pages/guide/GuideDeptPage.vue` | 部门映射管理页 |
| `admin-web/src/pages/guide/GuideThemePage.vue` | 主题映射管理页 |
| `admin-web/src/pages/guide/GuideItemConfigPage.vue` | 事项展示配置页 |
| `admin-web/tests/guide.api.spec.ts` | 三组 API 测试 |
| `admin-web/tests/guide.permissions.spec.ts` | 权限 composable 测试 |
| `admin-web/tests/guide.routes.spec.ts` | 路由 403 守卫测试 |
| `admin-web/tests/guide.form.spec.ts` | 表单工具测试 |
| `admin-web/tests/guide.components.spec.ts` | 页面组件交互测试 |
| `admin-web/tests/helpers/guideTest.ts` | 测试辅助数据 |

### 修改

| 路径 | 说明 |
|---|---|
| `admin-web/src/router/index.ts` | 懒加载路由 3 条 |
| `admin-web/src/layouts/AdminLayout.vue` | 「办事指南配置」菜单组 |
| `admin-web/src/composables/usePermission.ts` | guide 权限 computed |
| `CLAUDE.md` | 开发状态更新 |

### 未修改

- `backend/**`（零改动）
- `kiosk-app/**`
- `deploy/**`、端口 5183/5184/3100
- 实际数据库

---

## 二、页面与路由

| 路由 | 页面 | 权限 |
|---|---|---|
| `/guide/depts` | 部门映射 | `guide:dept:read` |
| `/guide/themes` | 主题映射 | `guide:theme:read` |
| `/guide/item-configs` | 事项展示配置 | `guide:item:read` |

菜单组「办事指南配置」下按 read 权限显示子项；无 read 权限时整组隐藏。

---

## 三、API 封装

统一使用 `adminGet/adminPost/adminPut/adminDelete`（baseURL `/api/admin`）：

| 模块 | 路径前缀 |
|---|---|
| `depts.ts` | `/guide/depts` |
| `themes.ts` | `/guide/themes` |
| `itemConfigs.ts` | `/guide/item-configs` |

列表均使用 `PageResult<T>` 分页结构；事项列表支持 `deptCode`、`themeCode`、`isHot`、`isRecommend`、`isVisible` 筛选 query。

错误处理：复用 `ApiError`，409/400/404 显示后端 `message`；404 时刷新列表。

---

## 四、权限矩阵

| 权限码 | 菜单 | 路由 | 新增 | 编辑 | 删除 |
|---|---|---|---|---|---|
| `guide:dept:read` | 部门映射 | ✅ | — | — | — |
| `guide:dept:create` | — | — | ✅ | — | — |
| `guide:dept:update` | — | — | — | ✅ | — |
| `guide:dept:delete` | — | — | — | — | ✅ |
| `guide:theme:read` | 主题映射 | ✅ | — | — | — |
| `guide:theme:create/update/delete` | — | — | 对应按钮 | 对应按钮 | 对应按钮 |
| `guide:item:read` | 事项配置 | ✅ | — | — | — |
| `guide:item:create/update/delete` | — | — | 对应按钮 | 对应按钮 | 对应按钮 |

`SUPER_ADMIN` / `permissions: ['*']` 沿用现有 `auth.hasPermission` 通配逻辑。

---

## 五、表单字段及交互

### 部门映射

- 创建：`deptCode`（只读提示）、`deptName`、`displayName`、`icon`、`floorText`、`areaText`、`isVisible`、`sortOrder`
- 编辑：`deptCode` 禁用；可改 `status`（active/disabled）
- 删除：二次确认 + 逻辑删除

### 主题映射

- 创建：`themeCode`（只读提示）、`themeName`、`platformParamJson`（多行文本）、`icon`、`isVisible`、`sortOrder`
- 编辑：`themeCode` 禁用；`platformParamJson` 前端 `isValidJsonText` 校验，不解析展示凭据
- 列表仅显示「已配置/—」，不暴露 JSON 内容

### 事项展示配置

- 创建：`platformItemId`（只读提示）、`itemName`、`displayName`、`deptCode`、`themeCode`、三个开关、`sortOrder`、关联 ID 标签列表
- 编辑：`platformItemId` 禁用；关联 ID 用 `RelatedIdEditor`（`string[]`）
- 更新时未触碰关联 ID 则不提交 `relatedPolicyIds`/`relatedFaqIds`（避免误清空）
- 创建时空关联提交 `[]`；筛选支持部门/主题/热门/推荐/可见

### 通用交互

- 列表 `v-loading`；提交 `submitting` 防重复点击
- 成功关闭弹窗并刷新；失败保留表单
- `destroy-on-close` + `@closed` 清理状态
- 编码字段展示后端返回大写，前端不做额外变换

---

## 六、测试场景与数量

| 文件 | 数量 | 覆盖 |
|---|---|---|
| `guide.api.spec.ts` | 11 | 三组 API 路径/方法、分页筛选、409/404 |
| `guide.permissions.spec.ts` | 5 | 菜单、按钮权限、SUPER_ADMIN |
| `guide.routes.spec.ts` | 3 | 无权限 403、有权限进入 |
| `guide.form.spec.ts` | 3 | JSON/UUID 校验 |
| `guide.components.spec.ts` | 9 | 编码只读、删除确认、JSON 拦截、关联 ID string[]、未改关联不误清、重复提交、弹窗状态 |
| **本阶段新增** | **31** | |
| **admin-web 合计** | **160 passed** | 原 129 无回归 |

---

## 七、完整验证结果

| 命令 | 结果 |
|---|---|
| `cd admin-web && npm run type-check` | ✅ |
| `cd admin-web && npm run build` | ✅ |
| `cd admin-web && npm test -- --run` | ✅ **160 passed** |
| `cd backend && npm run type-check && npm run build && npm test -- --runInBand` | ✅ 497 passed |
| `cd kiosk-app && npm run build && npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ |
| `cd kiosk-app/tests && npm test -- --run` | ✅ 91 passed |

### 远程访问（5184）

- `http://10.217.19.22:5184/` → HTTP 200（SPA 壳层）
- `http://10.217.19.22:5184/guide/depts` → HTTP 200（客户端路由；未登录时由路由守卫跳转 `/login`，无权限跳转 `/forbidden`）
- 未修改 5183、3100 端口配置

---

## 八、数据库与后端

**未修改 backend 业务实现、接口契约、数据库或迁移。**  
**未连接或修改实际数据库。**

---

## 九、未完成事项与风险

| 项 | 说明 |
|---|---|
| 群众端办事指南 | `/api/public/service-guide/*` 未实现 |
| 共享平台对接 | ServiceGuideModule 仍为 mock |
| 关联内容校验 | 关联 ID 未校验 content_item 是否存在 |
| dept/theme 下拉 | 事项配置中部门/主题编码为文本输入，未做下拉联动 |
| 远程浏览器验收 | curl 仅验证静态资源可达；登录/403 依赖客户端路由守卫 |

---

## 十、停止边界

本阶段仅交付 admin-web 办事指南配置管理页面及前端测试，按要求停止，不进入群众端或共享平台真实对接。
