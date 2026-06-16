# Step 15B-1：群众端首页 UI 第一阶段实现

**日期**：2026-06-12  
**范围**：仅 `kiosk-app` — 设计令牌、首页视觉改造、离线首页同步  
**依据**：`065-step15a-kiosk-ui-design-plan.md`

---

## 1. 修改文件清单

### 新增

| 路径 | 说明 |
|---|---|
| `kiosk-app/src/styles/tokens.css` | 设计令牌 CSS 变量（色彩、字号、间距、圆角、阴影、触控尺寸） |
| `kiosk-app/src/styles/home.css` | 首页布局、glass 卡片、动效、离线提示条 |
| `kiosk-app/src/utils/applyTheme.ts` | Public API `theme` → CSS 变量映射 |
| `kiosk-app/src/utils/homeModuleLayout.ts` | `layoutType` 解析、honor 模块识别、排序校验 |
| `kiosk-app/src/components/brand/TriColorArcLogo.vue` | 三色弧形标志 **临时 SVG 占位** |
| `kiosk-app/src/components/home/KioskHomeHeader.vue` | 顶区：标志、蓝天白云、海平线、幸福门抽象框 |
| `kiosk-app/src/components/home/HomeModuleCard.vue` | glass / honor 模块卡片 |
| `kiosk-app/src/components/home/HomeHotItemCard.vue` | 高频事项 XL 卡片 |
| `kiosk-app/src/components/home/HomeModuleGrid.vue` | 12 列错落网格 |
| `kiosk-app/tests/homeModuleLayout.spec.ts` | 布局与离线排序单测 |

### 修改

| 路径 | 说明 |
|---|---|
| `kiosk-app/src/main.ts` | 引入 `tokens.css`、`home.css` |
| `kiosk-app/src/App.vue` | 顶区改 `KioskHomeHeader`；离线提示条；theme 应用 |
| `kiosk-app/src/pages/Home.vue` | 错落布局、glass 卡片、通知区样式 |
| `kiosk-app/src/components/KioskBottomNav.vue` | glass 底栏、触控反馈 |
| `kiosk-app/src/config/offlineHomeConfig.ts` | 模块顺序与 `layoutType` 同步 |
| `kiosk-app/src/content/modules.ts` | `policies.homeLabel` →「政策公开」 |
| `kiosk-app/tests/helpers/publicApiMock.ts` | Mock 模块顺序：政策公开在按部门查前 |
| `kiosk-app/tests/publicHomeConfig.spec.ts` | 断言文案「政策公开」 |
| `kiosk-app/tests/homeNavigation.spec.ts` | 排序断言、HomeModuleGrid 引用 |
| `kiosk-app/tests/layout.spec.ts` | 29vh/68vh 改查 header 组件与 home.css |

### 未修改

- `backend/`、`admin-web/`、数据库迁移、API 基线文档  
- `package.json`（**未新增依赖**）

---

## 2. 首页 UI 实现说明

1. **设计令牌**：`tokens.css` 定义海滨蓝白主色、glass 半透明、暖金 `#E8C872`、浅红 honor 点缀；字号 1.625rem～3rem；触控最小 48px；卡片高度分 xl/l/m/s/banner 档。
2. **顶区（29vh）**：`KioskHomeHeader` 纯展示 — 标志、标题、副标题、横幅、时钟；无主要交互按钮。
3. **中区（68vh）**：`Home.vue` 使用 `home-module-grid` 12 列网格，按 `layoutType` 映射 `xl/l/m/s/banner/full` 跨度；高频事项 `HomeHotItemCard` 占满行（XL）；模块卡片 glass 效果 + 轻微入场/按压动效。
4. **底栏**：`KioskBottomNav` glass 风格，保留首页/返回/重来/帮助。
5. **离线提示**：`source === 'offline'` 时显示黄色提示条，不阻断操作。
6. **Theme**：远程 `theme.primaryColor` / `accentGold` / `honorTint` / `backgroundTop` 映射到 CSS 变量。

---

## 3. 标志资源处理方式

- **当前**：`TriColorArcLogo.vue` 内联 SVG — 蓝/白/金三色弧形占位，符合 065 方案「无附件时用项目内临时占位」。
- **待办**：需用户提供正式 PNG/SVG 标志资源，替换 `TriColorArcLogo.vue` 或改为静态资源引用。

---

## 4. 幸福门抽象图形处理方式

- 在 `KioskHomeHeader.vue` 底部居中用 **纯 CSS** 绘制半圆拱形「大相框」：
  - `border-radius: 110px 110px 0 0` 拱顶
  - 浅蓝边框 + 内阴影渐变
  - 与海平线（`horizon` 渐变线）叠加，形成海滨城市抽象意象
- 不使用真实照片或国徽元素。

---

## 5. 政策公开 / 按部门查位置互换说明

**离线兜底**（`offlineHomeConfig.ts`）模块顺序：

1. 模范先锋岗（banner）
2. **政策公开**（`content_policies`，layout `l`）
3. 按主题查（`m`）
4. **按部门查**（`guide_dept`，layout `l`）
5. 其余 content 模块

相对旧版（guide_dept → guide_topic → content…），**政策公开已提升至按部门查之前**。远程 API 仍按后端 `sortOrder` 返回；离线兜底与 065 设计默认顺序一致。

Mock 数据（`publicApiMock.ts`）同步调整为 policies 在 guide_dept 前，便于联调测试。

---

## 6. 零键盘约束验证

- `tests/no-keyboard.spec.ts`：**22 个 Vue 文件全部通过**，无 `<input>` / `<textarea>` / `contenteditable`。
- 新增组件均为 `<button type="button">`，无聚焦输入控件。

---

## 7. Public API 调用验证

| 检查项 | 结果 |
|---|---|
| 仅调用 `/api/public/home/config`（首页加载） | ✅ `publicHomeConfig.spec.ts` 单次请求断言通过 |
| 不调用 `/api/admin/*` | ✅ `Public Home API 安全约束` 用例通过 |
| HTTP 503 离线兜底 | ✅ 使用 `OFFLINE_HOME_CONFIG` |
| 网络失败离线兜底 | ✅ 不白屏、不显示「数据加载失败」 |
| 模块跳转逻辑保留 | ✅ `navigateHomeModule` 用例通过 |

---

## 8. 构建与测试结果

```text
cd kiosk-app && npm run build
# ✓ built in ~2.5s

cd kiosk-app/tests && npm test
# Test Files  23 passed (23)
# Tests       160 passed (160)

git diff --check
# （无 trailing whitespace 错误）
```

---

## 9. 未完成事项

| 项 | 说明 |
|---|---|
| 正式标志资源 | 需用户 PNG/SVG，替换 `TriColorArcLogo.vue` 占位 |
| 二级/三级页面 UI | 本轮范围外（Step 15B-2 及以后） |
| 模范先锋岗独立页 | 离线 banner 暂链 `/help`；showcase 路由未实现 |
| 窗口导航模块 | 无对应路由，样式已支持 banner/honor，跳转待后续 |
| `index.css` 内 @import | 因文件权限未改；改由 `main.ts` 直接 import tokens/home |

---

## 10. 结论

**通过**

- 设计令牌、顶区视觉、错落首页布局、离线配置同步均已落地  
- 保留 Public Home API 行为与跳转逻辑  
- 动效克制且支持 `prefers-reduced-motion`  
- 构建与 160 项测试全部通过  
- 未新增 npm 依赖、未修改 backend/admin-web
