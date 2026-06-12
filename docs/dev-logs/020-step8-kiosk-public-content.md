# 020 · Step 8 kiosk-app 政务公开内容页面接入

**交付日期**：2026-06-12  
**基于**：019-step7-public-content-api.md  
**状态**：✅ 完成

---

## 一、任务目标

将 kiosk-app 接入 `/api/public/content/*`，实现 1080×1920 竖屏触摸场景的政务公开列表与详情浏览，遵守零键盘与三区布局约束。

---

## 二、修改文件清单

### 新增（kiosk-app）

| 文件 | 说明 |
|---|---|
| `src/content/modules.ts` | 模块 ↔ API 路径段集中映射 |
| `src/content/public-content.service.ts` | —（逻辑在 service 层由 pages 调用 endpoints） |
| `src/api/types.ts` | 增加 `PublicContentListItem` / `PublicContentDetail` |
| `src/api/endpoints.ts` | `getPublicContentList` / `getPublicContentDetail` |
| `src/stores/content.ts` | 列表页码、详情临时状态 |
| `src/utils/sanitizeBody.ts` | 正文白名单清理 |
| `src/utils/formatContent.ts` | 空字段兜底、日期格式化 |
| `src/pages/ContentList.vue` | 通用列表页 |
| `src/pages/ContentDetail.vue` | 通用详情页（仅 supportsDetail 类型） |
| `src/components/SafeBody.vue` | 安全正文展示 |
| `tests/*.spec.ts` | 单元/静态测试（10 文件） |
| `tests/package.json` | 独立 vitest 环境（规避根目录权限限制） |
| `tests/vitest.config.ts` | vitest 配置 |
| `tsconfig.check.json` | vue-tsc 类型检查配置 |

### 修改

| 文件 | 说明 |
|---|---|
| `src/app/router.ts` | `/content/:type`、`/content/:type/:id` |
| `src/pages/Home.vue` | 政务公开 9 模块入口 |
| `src/App.vue` | 重来/90 秒空闲时 `contentStore.reset()` |
| `CLAUDE.md` | kiosk-app Step 8 状态 |

### 未修改

- `backend/`、`admin-web/`、数据库、迁移、授权

---

## 三、页面与路由结构

| 路由 | 页面 | 说明 |
|---|---|---|
| `/home` | Home | 含「政务公开」9 宫格入口 |
| `/content/:type` | ContentList | 列表 + 分页 + 重试 |
| `/content/:type/:id` | ContentDetail | 详情（仅 supportsDetail=true） |
| 底部导航 | BottomNav | 首页 / 返回 / 重来 / 帮助（不变） |

---

## 四、模块与 API 映射

| 首页模块 | routeKey | API 路径段 | 详情 |
|---|---|---|---|
| 政策文件 | policies | policies | ✅ |
| 政策解读 | interpretations | interpretations | ✅ |
| 信息公开指南 | open-guide | open-guide | 仅列表 |
| 信息公开制度 | open-system | open-system | 仅列表 |
| 主动公开目录 | open-catalog | open-catalog | 仅列表 |
| 年度报告 | annual-reports | annual-reports | 仅列表 |
| 机构职能 | organizations | organizations | ✅ |
| 常见问题 | faqs | faqs | ✅ |
| 通知公告 | notices | notices | ✅ |

列表请求：`GET /api/public/content/{apiSegment}?page=&pageSize=`  
详情请求：`GET /api/public/content/{apiSegment}/{id}`（仅 supportsDetail 类型发起）

---

## 五、触摸及零键盘约束验证

| 约束 | 实现 |
|---|---|
| 1080×1920 竖屏三区 | App.vue 保持 header 29vh + main 68vh + BottomNav |
| 无 input/textarea/contenteditable | `tests/no-keyboard.spec.ts` 扫描全部 `.vue` ✅ |
| 大卡片 + 上一页/下一页 | ContentList BigCard + 分页按钮 |
| 90 秒无操作回首页 | `useIdleHome` + `contentStore.reset()` |
| 重来清理状态 | `/home?reset=1` 触发 guide + content store 重置 |
| 防重复点击导航 | `navigating` / `loadingLock` 闩锁 |

---

## 六、错误、空数据和离线兜底

| 场景 | 表现 |
|---|---|
| 列表加载中 | 「加载中...」 |
| 列表为空 | 「暂无相关内容」 |
| 接口失败 | 友好提示 + **重试**按钮 |
| 详情字段为空 | 「暂无相关信息」 |
| 断网/超时 | client 统一错误文案，页面不白屏 |
| 封面图 | `coverFileId` 存在时显示占位「封面图待接入」，不伪造图片 |

### 正文安全

- 纯文本：HTML 转义后换行展示
- 含 HTML：经 `sanitizePublicBody` 白名单清理后受控 `v-html`
- 测试覆盖 script/onerror/javascript: 移除

---

## 七、已执行验证

```bash
cd kiosk-app
npm run build                                              # ✅
npx vue-tsc --noEmit -p tsconfig.check.json                # ✅
cd tests && npm test                                       # ✅ 58 passed

cd ../backend
npm run type-check                                         # ✅
npm test -- --runInBand                                    # ✅ 341 passed, 35 skipped
```

**说明**：根目录 `package.json` 因文件权限未能写入 `type-check`/`test` 脚本；等效命令见上。测试运行于 `kiosk-app/tests/` 独立 vitest 环境。

### 业务链路（设计验证 + 集成对齐 Step 7）

| 步骤 | kiosk 行为 |
|---|---|
| 首页 → 政策文件 | `/content/policies` |
| 列表分页 | page 状态 + 上一页/下一页 |
| 点击卡片 | `/content/policies/:id` |
| 返回 | BottomNav BACK |
| 重来 | 清理 content store |
| 接口失败 | 重试按钮重新 load |
| 90 秒无操作 | 回首页并 reset |

---

## 八、测试通过数

| 套件 | 通过 |
|---|---|
| kiosk-app vitest（`tests/`） | **58** |
| backend 单元（回归） | **341**（35 skipped 为 MySQL 集成套件） |

---

## 九、数据库与环境确认

| 项 | 结论 |
|---|---|
| backend / 数据库 / 迁移 | **未修改** |
| admin-web | **未修改** |
| oms_db / mydb | **未访问** |
| 密码/凭据 | 报告中 **未记录** |

---

## 十、尚未完成事项与风险

| 项 | 说明 |
|---|---|
| 封面图 | 待 `GET /api/public/files/:id` 完成后替换占位 |
| categoryId 筛选 UI | API 已支持，本期未做分类卡片筛选 |
| 文本搜索 | 二期，本期未实现 |
| 根 package.json 脚本 | 需运维修复文件权限后补充 `type-check`/`test` |
| 真机 APK 触摸验收 | 需在 1080×1920 设备上人工确认滚动与字号 |
| 政务公开列表与办事指南首页热区 | 首页高频事项仍为办事指南 mock，政务公开独立区块已新增 |

---

## 十一、本地开发命令

```bash
# 终端 1：后端
cd backend && npm run dev

# 终端 2：群众端
cd kiosk-app && npm run dev
# 访问 http://localhost:5173 → 首页「政务公开」→ 政策文件等
```
