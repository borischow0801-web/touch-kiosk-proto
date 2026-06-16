# Step 15B-1A：群众端首页 UI 视觉还原修复

**日期**：2026-06-12  
**范围**：仅 `kiosk-app` 首页视觉；不改 backend / admin-web / 基线文档  
**依据**：065-step15a-kiosk-ui-design-plan.md、066-step15b1-kiosk-home-ui-implementation.md

---

## 1. 修改范围

### 新增

| 路径 | 说明 |
|---|---|
| `kiosk-app/public/assets/brand/tri-color-emblem.svg` | 三色弧形标志静态资源（可覆盖替换） |
| `kiosk-app/src/constants/brandAssets.ts` | 标志资源路径常量 `TRI_COLOR_EMBLEM_SRC` |
| `kiosk-app/src/components/brand/BrandEmblem.vue` | 通过 `<img>` 引用静态标志 |

### 修改

| 路径 | 说明 |
|---|---|
| `kiosk-app/src/components/home/KioskHomeHeader.vue` | 顶区重设计：左标志+标题、右时钟、多层幸福门/海面/云层 |
| `kiosk-app/src/components/home/HomeModuleCard.vue` | Liquid Glass 卡片、色条、honor 横幅、稀疏布局 span |
| `kiosk-app/src/components/home/HomeHotItemCard.vue` | 强化 XL 热项 glass 效果 |
| `kiosk-app/src/styles/tokens.css` | 补充 sky-deep、liquid 阴影、honor tint |
| `kiosk-app/src/styles/home.css` | Liquid Glass 多层阴影/高光/渐变；修复动效块 |
| `kiosk-app/src/utils/homeModuleLayout.ts` | `resolveModuleDisplayLayout` 稀疏网格自适应 |
| `kiosk-app/src/config/offlineHomeConfig.ts` | 13 个默认模块、错落 layoutType、窗口导航占位 |
| `kiosk-app/tests/homeModuleLayout.spec.ts` | 稀疏双模块、离线模块数量断言 |
| `kiosk-app/src/pages/Home.vue` | 通知卡 liquid-glass |

### 删除

| 路径 | 说明 |
|---|---|
| `kiosk-app/src/components/brand/TriColorArcLogo.vue` | 移除内联临时 SVG 组件 |

---

## 2. 首页视觉修复点

### 2.1 顶部标志

- **处理方式**：仓库内**未找到用户聊天附件中的正式 PNG/SVG 文件**（全仓库无 `.png`/`.jpg` 业务标志资源）。
- **实现**：建立静态资源入口 `public/assets/brand/tri-color-emblem.svg`，组件 `BrandEmblem.vue` 通过 `brandAssets.ts` 常量加载。
- **替换方式**：将用户正式标志覆盖上述 SVG，或改为 `.png` 并更新 `TRI_COLOR_EMBLEM_SRC` 路径即可，无需改布局代码。
- **已移除** 066 阶段的内联 `TriColorArcLogo.vue` 临时 SVG 组件。

### 2.2 顶部视觉（KioskHomeHeader）

- 左对齐：**BrandEmblem + title/subtitle**；右上只读时钟。
- 背景：天空 `#B8DCFF → #EAF4FF → #FFF` 三层渐变；三朵白云轻微漂移。
- 海天线 + 海面渐变 + 波纹高光。
- **幸福门抽象**：外拱 + 内拱 + 左右玻璃柱 + 顶部横梁 + 水面倒影，多层结构，非单线半圆。
- 顶区仍无 input、无主要交互按钮。

### 2.3 首页模块 Liquid Glass

- `.liquid-glass`：半透明渐变底、16px blur、saturate、外阴影 + 内顶高光 + 径向光泽伪元素。
- 卡片左侧色条（模块 `color` 或默认 Horizon 蓝）；右侧 chevron 引导。
- honor 模块：浅红 tint + 暖金左边框 + ★ 徽章，**无大面积正红**。

### 2.4 错落布局与稀疏适配

- 离线 13 模块按 065 推荐顺序与 layoutType（banner / l / m / s）混排。
- `resolveModuleDisplayLayout`：远程仅 1/2/3 个模块时自动调整 `gridColumnSpan`（如 2 模块各 span 6 双列填满），**不伪造后端数据**。
- 政策公开默认仍在按部门查之前（离线顺序 + API sortOrder 尊重远程）。

### 2.5 动效

- 卡片入场 240ms、按压 scale(0.985)、云层/波纹漂移。
- `prefers-reduced-motion: reduce` 关闭 transform 动效。

---

## 3. 与 065 设计方案逐项对照

| 065 要求 | 15B-1A 状态 |
|---|---|
| 海滨蓝白 + 云层 + 海平线 | ✅ 顶区多层渐变、云、海、波纹 |
| 幸福门大相框抽象 | ✅ 外/内拱 + 柱 + 横梁 + 倒影 |
| 三色弧形标志（用户素材） | ⚠️ 静态 SVG 占位 + 可替换入口；**待用户覆盖正式资源** |
| Liquid Glass 卡片 | ✅ 强化半透明/阴影/高光/渐变 |
| 错落 layoutType xl/l/m/s/banner | ✅ 离线 + 稀疏自适应 |
| 政策公开高于按部门查 | ✅ 离线顺序；远程依 API sortOrder |
| 模范先锋岗 honor 横幅 | ✅ 样式就绪；远程无模块则不显示（见 §4） |
| 顶 29vh / 中 68vh / 底 96px | ✅ 保持 |
| 零键盘 | ✅ 22 个 Vue 文件扫描通过 |
| 仅 Public API | ✅ 无 `/api/admin/*` |

---

## 4. 当前远程配置对截图效果的影响说明

### 4.1 为什么远程首页可能只显示 2 个模块

当前 Public Home API 返回的 `modules` 数组**完全由管理端已发布的首页配置决定**。若后端/管理端仅配置并发布了例如：

1. `content_policies`（政策公开）
2. `guide_dept`（按部门查）

则群众端**只渲染这 2 个模块**，不会客户端追加其它模块（符合「不伪造后端数据」约束）。

### 4.2 UI 在 2 模块下是否自然

- `resolveModuleDisplayLayout` 将 2 模块各设为 **span 6**，同一行双列 Liquid Glass 大卡填满宽度，**不会出现大片空白**。
- 若远程 `sortOrder` 将政策公开排在按部门查前，视觉顺序与 065 一致；若管理端顺序相反，以 API 为准。
- **模范先锋岗**：仅当 `home_module` 含 `showcase_pioneer` / showcase / 名称含「模范」「先锋」时出现 honor 横幅。**当前远程配置若无该模块，截图不出现是配置原因，非 UI 缺陷**。
- **高频事项 / 通知摘要**：同样依赖 API 的 `homeHotItems`、`noticeSummaries`；为空则不展示对应区块。

### 4.3 离线兜底（503/断网）

`offlineHomeConfig.ts` 提供 **13 个**默认模块（含 pioneer banner、政策公开、办事指南入口、9 类 content、窗口导航占位），用于断网时展示完整首页效果。

---

## 5. 构建和测试结果

```text
cd kiosk-app && npm run build
# ✓ built in ~2.6s

cd kiosk-app/tests && npm test -- --run
# Test Files  23 passed (23)
# Tests       162 passed (162)

grep /api/admin/ kiosk-app/src → 无匹配
no-keyboard.spec.ts → 22 个 Vue 文件通过

git diff --check → 通过
```

---

## 6. 未完成事项

| 项 | 说明 |
|---|---|
| **用户正式标志文件** | 需将附件 PNG/SVG 覆盖 `public/assets/brand/tri-color-emblem.svg` 或更新 `brandAssets.ts` |
| 模范先锋岗 / 窗口导航页 | 路由未实现；离线 banner/导航暂链 `/help` |
| 二级/三级页面 UI | 本轮范围外 |
| 管理端首页模块补全 | 若需远程也展示 6–10 模块，须在 admin-web 发布更多 `home_module` |

---

## 7. 是否可以进入二级/三级页面 UI 改造

**可以。**

首页视觉还原度已提升至 065 方案可接受水平：顶区沿海意象、Liquid Glass 错落卡片、honor 横幅、稀疏模块自适应与离线完整兜底均已就绪。剩余差距主要在**用户正式标志资源替换**与**管理端首页模块配置补全**（远程展示内容），不阻塞 Step 15B-2 二级/三级页面 UI 改造。

**结论：通过**（标志资源待用户覆盖正式文件后视觉可最终闭环）
