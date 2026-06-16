# 052 · Step 14B-4 首页配置发布适配器

**交付日期**：2026-06-16  
**基于**：051-step14b3a-home-config-admin-contract-closure.md  
**执行方**：Cursor  
**状态**：通过

---

## 一、执行范围

实现 `home_config` 统一审核发布能力，接入现有 `/api/admin/publish/:bizType/:bizId/*` 通用接口。

**已实现**：`HomeConfigPublishService`、PublishService 路由扩展、单元与 HTTP 测试。

**未实现**：GET `/api/public/home/config` 真实数据库查询、admin-web 页面、kiosk-app 改造。

**未修改**：admin-web、kiosk-app、deploy、`docs/database.md`、`docs/architecture.md`、`docs/api-spec.md`、`CLAUDE.md`、Entity、Migration、环境配置。

**未连接或操作**任何数据库。

---

## 二、修改文件清单

| 文件 | 说明 |
|---|---|
| `backend/src/home-config/home-config-publish.service.ts` | **新增** 首页配置发布门面服务 |
| `backend/src/home-config/home-config.module.ts` | 注册 PublishRecord、导出 HomeConfigPublishService |
| `backend/src/publish/constants/publish.constants.ts` | SUPPORTED_BIZ_TYPES 增加 `home_config` |
| `backend/src/publish/publish.service.ts` | 按 bizType 路由至 content / home_config 适配器 |
| `backend/src/publish/publish.module.ts` | 导入 HomeConfigModule |
| `backend/test/home-config-publish.spec.ts` | **新增** HomeConfigPublishService 单元测试（15 用例） |
| `backend/test/publish.spec.ts` | 更新路由测试；home_config 不再返回 400 |
| `docs/dev-logs/052-step14b4-home-config-publish-adapter.md` | 本报告 |

---

## 三、HomeConfigPublishService 状态机说明

参考 `ContentPublishService` 门面与事务模式，主表 `home_config` 与版本 `home_config_version` 分离流转：

| 操作 | home_config（主表） | home_config_version | current_version_id |
|---|---|---|---|
| **submit** | 无 `currentVersionId` 且 `draft`/`rejected` → `pending`；有已发布版本 → **保持 `published`**；`withdrawn` → **保持 `withdrawn`** | `draft` → `pending` | 不变 |
| **approve** | → `published` | 目标版本 → `published` | 更新为目标版本 id |
| **reject** | 无 `currentVersionId` 且非 `withdrawn` → `rejected`；有已发布版本 → **保持 `published`**；`withdrawn` → **保持 `withdrawn`** | `pending` → `rejected` | 不变 |
| **directPublish** | → `published` | `draft` → `published` | 更新为目标版本 id |
| **withdraw** | → `withdrawn` | 当前生效版本 → `withdrawn` | **清空** |
| **rollback** | **不变** | 复制历史版本及 `home_module` 为新 `draft` | **不变** |

约束：

- 仅 `draft`/`pending` 版本可通过发布流程变更 status；不修改非 draft/pending 可编辑字段
- 存在 `pending` 时 submit / directPublish 返回 **409**
- rollback 前若已有 `draft` 或 `pending` 返回 **409**
- 新版本发布时历史 `published` 版本 **保留**，不自动改为 `withdrawn`
- rollback 产物为 `draft`，须再次 submit/approve 或 directPublish 才生效

---

## 四、PublishService 接入说明

```typescript
SUPPORTED_BIZ_TYPES = ['content', 'home_config']
```

`PublishService` 各方法按 `bizType` 分发：

| bizType | 适配器 |
|---|---|
| `content` | `ContentPublishService`（行为不变） |
| `home_config` | `HomeConfigPublishService` |
| 其他 | `BadRequestException`（400） |

Controller 无需改动，现有路由直接支持：

- `POST /api/admin/publish/home_config/:bizId/submit`
- `POST /api/admin/publish/home_config/:bizId/approve`
- `POST /api/admin/publish/home_config/:bizId/reject`
- `POST /api/admin/publish/home_config/:bizId/direct-publish`
- `POST /api/admin/publish/home_config/:bizId/withdraw`
- `POST /api/admin/publish/home_config/:bizId/rollback`
- `GET /api/admin/publish/home_config/:bizId/records`

权限沿用 `publish:submit`、`publish:approve` 等共用权限码。

---

## 五、publish_record 记录说明

每次发布操作在事务内写入 `publish_record`：

| 字段 | 值 |
|---|---|
| `biz_type` | `home_config`（固定） |
| `biz_id` | `home_config.id` |
| `version_id` | `home_config_version.id` |
| `action` | `submit` / `approve` / `reject` / `direct_publish` / `withdraw` / `rollback` |
| `from_status` / `to_status` | 版本或主表流转前后状态 |
| `operator_id` | 当前操作人 |
| `operated_at` | 操作时间 |

`listRecords` 按 `biz_type=home_config`、`biz_id` 查询，按 `operated_at DESC` 排序，与 content 对齐。

---

## 六、测试结果

```bash
git diff --check          # 通过
cd backend && npm test -- --runInBand
# Test Suites: 34 passed
# Tests:       639 passed
```

### HomeConfigPublishService（15 用例）

- submit：首次无发布版本 → 主表 pending
- submit：已有 currentVersionId → 主表保持 published
- submit：withdrawn 主表保持 withdrawn
- approve：pending → published，更新 currentVersionId
- reject：无 currentVersionId → 主表 rejected
- reject：已有 currentVersionId → 主表保持 published
- directPublish：draft → published
- directPublish：存在 pending → 409
- withdraw：published → withdrawn，清空 currentVersionId
- rollback：复制历史版本和模块为新 draft，不改变 currentVersionId
- rollback：已有 draft / pending → 409
- approve 时历史 published 版本不被自动 withdrawn
- 每个发布操作写 publish_record
- 配置不存在 → 404

### PublishService / Controller

- `guide_config` 等不支持类型仍返回 400
- `home_config` submit 路由到 HomeConfigPublishService
- `content` submit 仍路由到 ContentPublishService
- HTTP `POST /api/admin/publish/home_config/:bizId/submit` 可正常调用
- 401 / 403 权限测试未退化

### 回归

- content、guide、home-config Admin CRUD 测试全部通过

---

## 七、声明

- **未实现** Public Home API 真实组合查询
- **未修改** admin-web、kiosk-app、deploy、基线文档、Entity、Migration、环境配置
- **未连接或操作**任何数据库；全部测试使用内存 mock Repository

---

## 八、下一步建议

**Step 14B-5**：实现 Public Home API 真实组合查询

- `GET /api/public/home/config` 读取 `home_config.status=published` 且 `current_version_id` 有效的已发布版本
- 组合该版本下 `is_visible=1` 的 `home_module`
- 叠加 `guide_item_config` 高频事项与已发布 notices 摘要
- 移除或替换 `HomeConfigService.getPublicConfig()` mock
