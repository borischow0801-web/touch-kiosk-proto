# 023 · Step 8 kiosk-app 测试工程卫生收口

**交付日期**：2026-06-15  
**基于**：022-step8-kiosk-test-lifecycle-closure.md  
**状态**：✅ 完成

---

## 一、任务范围

仅处理测试工程卫生问题：Git 缓存跟踪、Tailwind 测试警告、`file:` 依赖安装可复现性。不开发新业务功能，不修改 backend / admin-web / 数据库 / 群众端业务逻辑。

---

## 二、实际修改文件

| 文件 | 说明 |
|---|---|
| `kiosk-app/tests/tailwind.config.cjs` | **新增** 测试专用 Tailwind，`content` 使用相对 app 根的绝对路径 |
| `kiosk-app/tests/postcss.config.cjs` | **新增** 测试专用 PostCSS，引用上述 Tailwind 配置 |
| `kiosk-app/tests/vitest.config.ts` | 增加 `css.postcss` 指向测试 PostCSS |
| `kiosk-app/tests/verify-parent-deps.mjs` | **新增** `pretest` 检查主工程 `node_modules` 是否已安装 |
| `kiosk-app/tests/package.json` | 增加 `pretest` 脚本 |
| `kiosk-app/.gitignore` | 增加 `**/.vitest-cache/` |
| `.gitignore`（仓库根） | 扩展 `kiosk-app/**/.vitest-cache/` |

**未修改**：`kiosk-app/tailwind.config.cjs`、`kiosk-app/postcss.config.cjs`（生产构建配置保持不变）。

**Git 索引操作**（未提交）：

```bash
git rm --cached -f kiosk-app/tests/.vitest-cache/vitest/results.json
```

---

## 三、Vitest 缓存 Git 跟踪处理

### 处理前

- `git ls-files` 包含 `kiosk-app/tests/.vitest-cache/vitest/results.json`
- 测试运行会改写该文件，污染 `git status`

### 处理后

| 检查项 | 结果 |
|---|---|
| `git ls-files 'kiosk-app/tests/.vitest-cache/**'` | **空**（已不再跟踪） |
| `git check-ignore kiosk-app/tests/.vitest-cache/vitest/results.json` | ✅ 命中 `kiosk-app/.gitignore` |
| 运行 `npm test` 后缓存文件存在磁盘 | ✅ 正常写入 |
| 运行测试后缓存作为未跟踪文件出现在 `git status` | **否**（已被 ignore） |

说明：工作区可能仍显示 `D kiosk-app/tests/.vitest-cache/...`（已暂存“从索引删除”），待下次提交后消失；此后测试不会再把缓存加入版本库。

---

## 四、Tailwind content 警告

### 根因

Vitest 从 `kiosk-app/tests/` 目录执行，`postcss.config.cjs` 加载根目录 `tailwind.config.cjs` 时，`content: ["./src/**/*"]` 按**进程 cwd**（`tests/`）解析，扫描不到 `kiosk-app/src/`，Tailwind 判定 content 为空并输出警告。

### 处理方式

- 在 `tests/` 下新增独立 `tailwind.config.cjs`，用 `path.join(__dirname, '..', 'src/...')` 指定源码路径
- `vitest.config.ts` 仅测试环境使用 `tests/postcss.config.cjs`
- **不**修改生产 `tailwind.config.cjs`，**不**屏蔽控制台

### 验证

复跑 `cd kiosk-app/tests && npm test`，输出中**无** `The content option in your Tailwind CSS configuration is missing or empty` 警告。

---

## 五、干净环境依赖安装顺序

`tests/package.json` 通过 `file:../node_modules/{vue,pinia,vue-router}` 链接主工程已安装包，**不依赖全局 npm 包**。

### 必须顺序

```bash
# 1. 主工程（提供 Vue 运行时与 tailwindcss/autoprefixer）
cd kiosk-app
npm install

# 2. 测试工程（Vitest、@vue/test-utils、happy-dom 等）
cd tests
npm install
```

### 防护

`npm test` 前自动执行 `pretest` → `verify-parent-deps.mjs`：若缺少 `kiosk-app/node_modules/{vue,pinia,vue-router}` 则退出并打印上述顺序。

### 说明

- 保持 `file:` 方案，未改造 monorepo
- `tests/node_modules` 已在 `.gitignore`，不提交
- `tests/package-lock.json` 保留，锁定 Vitest 侧依赖版本

---

## 六、验证命令及真实结果

| 命令 | 结果 |
|---|---|
| `git ls-files 'kiosk-app/tests/.vitest-cache/**'` | 空（无跟踪文件） |
| `cd kiosk-app && npm run build` | ✅ 通过（约 2.0s） |
| `npx vue-tsc --noEmit -p tsconfig.check.json` | ✅ 通过（无类型错误） |
| `cd kiosk-app/tests && npm test` | ✅ **17** 文件 / **91** 用例通过；无 Tailwind content 警告 |
| `cd backend && npm run type-check` | ✅ 通过 |
| `cd backend && npm test -- --runInBand` | ✅ **341** 通过（35 skipped） |

---

## 七、未完成事项与风险

| 项 | 说明 |
|---|---|
| 索引删除待提交 | `git rm --cached` 已执行，需随下次提交一并入库，否则协作者本地仍可能短暂看到 `D` 状态 |
| `file:` 双步安装 | 新克隆仓库必须按顺序安装主工程与 tests；`pretest` 可拦截误操作，但无法在单步 `tests/npm install` 中自动安装主工程 |
| npm `devdir` 提示 | 环境级 npm 配置警告，与本次改动无关，不影响测试结果 |

---

## 八、确认范围

- ✅ 未修改 backend 业务、admin-web、数据库、迁移
- ✅ 未修改群众端业务功能与 Public API 契约
- ✅ 未访问 `oms_db`、`mydb` 或其他项目数据库
- ✅ 无密码或凭据
