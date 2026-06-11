# 004 · Step 1 安全收尾

> 本次修复 003 交付中遗留的安全与群众端展示问题。

---

## 修改文件清单

| 文件 | 修改内容 |
|---|---|
| `backend/src/stats/dto/click-event.dto.ts` | `id` 字段加 `@Matches(/^[a-zA-Z0-9\-_:]{1,100}$/)` |
| `backend/src/stats/dto/page-view.dto.ts` | `path` 字段加 `@Matches(/^\/(?!\/)[a-zA-Z0-9\-_./]*$/)` |
| `backend/src/main.ts` | `ValidationPipe` 加 `forbidNonWhitelisted: true`；生产环境无 `CORS_ORIGIN` 时 `process.exit(1)` |
| `backend/src/service-guide/service-guide.service.ts` | `getItemTypes` 改为只返回该部门/主题下实际有事项的类型 |
| `kiosk-app/src/main.ts` | 入口处注册 `router.afterEach` 页面访问统计钩子（单次） |
| `kiosk-app/src/pages/ItemDetail.vue` | 法律依据、关联政策、常见问题、投诉电话四个字段改为"始终展示 + 空时显示暂无相关信息" |
| `kiosk-app/src/pages/ItemList.vue` | 列表为空时显示"暂无相关事项" |
| `deploy/docker-compose.yml` | backend env 加 `CORS_ORIGIN` 占位，注释说明生产环境必须配置 |

---

## 003 日志修正（勘误）

`003-step1-api-safety-alignment.md` 中有一处不准确：

> "idCard/mobile/name 等字段在 ValidationPipe whitelist 阶段剥离，不进入 Service，不出现在日志"

**实际情况**：在 003 交付时，`ValidationPipe` 只配置了 `whitelist: true`，未配置 `forbidNonWhitelisted: true`。`whitelist: true` 的行为是静默剥除未声明字段并返回 code 0（成功），而非 400 拒绝。本次 004 加入 `forbidNonWhitelisted: true` 后，携带多余字段的请求返回 400。

---

## 验证结果

### 构建 / 类型检查

| 项目 | 命令 | 结果 |
|---|---|---|
| backend | `npm run type-check` | ✅ 通过（0 错误） |
| backend | `npm run build` | ✅ 通过 |
| kiosk-app | `npm run build` | ✅ 通过（53 modules, 109.79 kB） |
| admin-web | `npm run type-check` | ✅ 通过（0 错误） |

### 安全 Smoke Test

| 测试用例 | 预期 | 实际 |
|---|---|---|
| 合法点击 `{type:"item_view", id:"i-001"}` | code 0 | ✅ code 0 |
| path 含查询串 `/home?reset=1` | code 400 | ✅ code 400 |
| path 双斜杠 `//evil.com/steal` | code 400 | ✅ code 400 |
| path 合法 `/home` | code 0 | ✅ code 0 |
| path 合法 `/items/i-001` | code 0 | ✅ code 0 |
| 含多余字段 `extra` | code 400 | ✅ code 400，message: property extra should not exist |

### getItemTypes 过滤验证

| 请求 | 预期（实际有事项的类型） | 实际 |
|---|---|---|
| d-001（人社局） | `apply`, `query`（无 cert） | ✅ `['apply', 'query']` |
| d-002（医保局） | `apply` | ✅ `['apply']` |

---

## 遗留风险

- `id` 字段正则 `[a-zA-Z0-9\-_:]` 无法语义区分"技术标识符"与"纯数字手机号"（如 `13800138000` 通过格式验证）。这是合理妥协：接口为匿名公开接口，字段用途是点击事件标识，纯数字字符串本身无 PII 注入风险，且日志不包含用户来源。
- 生产部署时 `CORS_ORIGIN` 需填写真实 kiosk 前端 origin（如 `http://kiosk.example.com`），`docker-compose.yml` 中的 `http://localhost` 仅为占位。
- mock 数据阶段所有事项详情的 `legalBasis`、`relatedPolicies`、`relatedFaqs`、`complaintPhone` 均为空，但群众端已正确展示"暂无相关信息"兜底。
