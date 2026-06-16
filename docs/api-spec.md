# 政务公开触摸查询系统

# API 接口设计说明书（api-spec.md）

版本：V1.0

---

## 一、API 设计原则

系统接口分为两类：

### 管理端接口

统一前缀：

`/api/admin`

特点：

- 必须登录
- 必须鉴权
- 写操作记录操作日志
- 面向 admin-web

### 群众端公开接口

统一前缀：

`/api/public`

特点：

- 不需要登录
- 面向 kiosk-app
- 只返回已发布内容
- 不返回后台管理字段
- 不暴露共享平台接口参数
- 不暴露共享平台凭据

---

## 二、统一响应结构

所有接口统一返回：

- code
- message
- data
- timestamp
- requestId

成功：

`code = 0`

失败：

`code != 0`

---

## 三、分页响应结构

分页接口 data 结构：

- list
- total
- page
- pageSize

---

## 四、通用错误码

建议错误码：

- 0：成功
- 400：请求参数错误
- 401：未登录或登录过期
- 403：无权限
- 404：资源不存在
- 409：状态冲突
- 500：服务器内部错误
- 502：外部接口调用失败
- 503：服务暂不可用
- 504：外部接口超时

---

## 五、管理端认证接口

### POST /api/admin/auth/login

说明：

管理端账号密码登录。

请求字段：

- username
- password

返回字段：

- accessToken
- userInfo
- permissions

### POST /api/admin/auth/logout

说明：

退出登录。

### GET /api/admin/auth/profile

说明：

获取当前登录用户信息。

---

## 六、系统管理接口

### 用户管理

- GET /api/admin/system/users（权限：system:user:read）
- POST /api/admin/system/users（权限：system:user:create）
- GET /api/admin/system/users/:id（权限：system:user:read）
- PUT /api/admin/system/users/:id（权限：system:user:update）
- DELETE /api/admin/system/users/:id（权限：system:user:delete）
- POST /api/admin/system/users/:id/reset-password（权限：system:user:reset-password）
- POST /api/admin/system/users/:id/disable（权限：system:user:update）
- POST /api/admin/system/users/:id/enable（权限：system:user:update）
- PUT /api/admin/system/users/:id/roles（权限：system:user:assign-roles）

#### PUT /api/admin/system/users/:id/roles

说明：替换目标用户持有的角色列表。

请求字段：

- roleIds（string[]，不可重复，不可超过 36 字符）

约束：

- 禁止修改自己的角色
- 所有 roleId 必须存在、active、未软删除，且属于一期三个固定角色
- 使用事务替换 sys_user_role 关联（先删后插）
- 移除 SUPER_ADMIN 角色时保护最后一个有效超级管理员
- 空数组合法，表示清除该用户全部角色

### 角色管理

- GET /api/admin/system/roles（权限：system:role:read）
- POST /api/admin/system/roles（权限：system:role:create）
- PUT /api/admin/system/roles/:id（权限：system:role:update）
- DELETE /api/admin/system/roles/:id（权限：system:role:delete）
- PUT /api/admin/system/roles/:id/permissions（权限：system:role:assign-permissions）

### 权限列表

- GET /api/admin/system/permissions（权限：system:permission:read）

#### GET /api/admin/system/permissions

说明：返回系统全量权限列表，供角色权限分配时使用。

返回字段（不返回内部字段）：

- id
- permissionCode
- permissionName
- moduleCode
- permissionType
- sortOrder

### 系统参数

- GET /api/admin/system/params
- PUT /api/admin/system/params/:key

### 日志

- GET /api/admin/system/operation-logs
- GET /api/admin/system/login-logs

---

## 七、内容管理接口

适用于：

- 政策文件
- 政策解读
- 信息公开指南
- 信息公开制度
- 主动公开目录
- 年度报告
- 机构职能
- FAQ
- 通知公告

### 内容分类

- GET /api/admin/content/categories
- POST /api/admin/content/categories
- PUT /api/admin/content/categories/:id
- DELETE /api/admin/content/categories/:id

### 内容主表

- GET /api/admin/content/items
- POST /api/admin/content/items
- GET /api/admin/content/items/:id
- PUT /api/admin/content/items/:id
- DELETE /api/admin/content/items/:id

### 内容版本

- GET /api/admin/content/items/:id/versions
- GET /api/admin/content/versions/:versionId

### 内容关联

- GET /api/admin/content/items/:id/relations
- PUT /api/admin/content/items/:id/relations

---

## 八、审核发布接口

所有可发布资源统一使用。

### 提交审核

POST /api/admin/publish/:bizType/:bizId/submit

### 审核通过

POST /api/admin/publish/:bizType/:bizId/approve

### 审核驳回

POST /api/admin/publish/:bizType/:bizId/reject

### 直接发布

POST /api/admin/publish/:bizType/:bizId/direct-publish

### 撤回

POST /api/admin/publish/:bizType/:bizId/withdraw

### 回滚版本

POST /api/admin/publish/:bizType/:bizId/rollback

### 发布记录

GET /api/admin/publish/:bizType/:bizId/records

bizType 示例：

- content
- home_config
- guide_config
- navigation
- showcase

---

## 九、办事指南配置接口

说明：

管理端只维护展示配置，不维护真实事项详情。

### 部门映射

- GET /api/admin/guide/depts
- POST /api/admin/guide/depts
- PUT /api/admin/guide/depts/:id
- DELETE /api/admin/guide/depts/:id

### 主题映射

- GET /api/admin/guide/themes
- POST /api/admin/guide/themes
- PUT /api/admin/guide/themes/:id
- DELETE /api/admin/guide/themes/:id

### 高频事项配置

- GET /api/admin/guide/item-configs
- POST /api/admin/guide/item-configs
- PUT /api/admin/guide/item-configs/:id
- DELETE /api/admin/guide/item-configs/:id

---

## 十、首页配置接口

说明：

- 一期仅维护 **一条逻辑首页配置**（`config_name=default`，主键为 UUID；单例由应用层事务保证，不使用数据库部分唯一索引）。
- 首页布局与展示字段存于 `home_config_version`；模块存于 `home_module`（归属版本，非主表）。
- 高频事项由 `GuideConfigModule` / `guide_item_config` 的 `is_hot`、`is_recommend` 维护，**不**写入首页版本快照。
- 审核发布走统一接口第八章，`bizType = home_config`。
- 基础配置编辑 **唯一入口** 为 `PUT /api/admin/home/config`；管理端模块 CRUD 仅操作当前 **`draft`** 版本。
- 存在 `pending` 版本时，禁止创建或编辑 `draft`（返回 409）。

### 权限

| 权限码 | 说明 |
|---|---|
| home:config:read | 读取首页配置、版本与模块 |
| home:config:update | 更新草稿版本基础信息 |
| home:module:read | 读取模块列表 |
| home:module:create | 新增模块 |
| home:module:update | 更新模块 |
| home:module:delete | 删除模块（逻辑删除） |
| home:module:sort | 模块排序 |
| publish:submit | 提交首页配置审核（共用） |
| publish:approve | 审核通过（共用） |
| publish:reject | 审核驳回（共用） |
| publish:direct-publish | 直接发布（共用） |
| publish:withdraw | 撤回（共用） |
| publish:rollback | 回滚（共用） |
| publish:record:read | 查看发布记录（共用） |

### 管理端 — 配置与版本

#### GET /api/admin/home/config

权限：`home:config:read`

说明：返回逻辑单例主表信息及当前 **`draft`** 版本（若不存在 `draft` 则 `draftVersion` 为 null，仅返回主表元数据与已发布版本摘要）。

响应 `data` 字段：

- id
- configName（固定 `default`）
- status
- currentVersionId（可空）
- currentVersion（可空对象，仅当存在已发布版本时返回摘要）
  - id
  - versionNo
  - title
  - subtitle
  - status
- draftVersion（可空对象，当前可编辑草稿）
  - id
  - versionNo
  - title
  - subtitle
  - topBannerJson（反序列化后的对象或数组）
  - themeJson（反序列化后的对象）
  - status
  - changeRemark
- updatedAt

**不得** 返回：`createdBy`、`updatedBy` 等审计字段；凭据、权限信息；内部数据库列名或未映射的后台字段。

#### PUT /api/admin/home/config

权限：`home:config:update`

说明：**唯一** 基础配置编辑入口。按下列规则隐式创建或更新 `draft`：

| 条件 | 行为 |
|---|---|
| 已存在 `draft` | 更新该 `draft` 正文 |
| 不存在 `draft` 且存在 `currentVersionId` | 事务内复制当前已发布版本 **及其模块** 生成新 `draft`，再应用本次更新；主表 **保持 `published`** |
| 首次使用（主表不存在） | 事务内创建 UUID 主表（`status=draft`）与 `version_no=1` 的 `draft`，再应用更新 |
| 已存在 `pending` 版本 | 返回 **409**，禁止创建或编辑 `draft` |

请求体：

- title（string，必填）
- subtitle（string，可选）
- topBannerJson（object 或 array，序列化存入 text）
- themeJson（object，序列化存入 text）
- changeRemark（string，可选）

约束：

- 不得修改非 `draft` 版本正文；不得修改 `current_version_id`。
- 不得通过本接口写入高频事项。

### 管理端 — 模块（归属当前 draft 版本）

> **路由顺序**：实现时 `PUT /api/admin/home/modules/sort` 必须 **优先于** `PUT /api/admin/home/modules/:id` 注册或匹配，避免 `sort` 被识别为 `:id`。

#### GET /api/admin/home/modules

权限：`home:module:read`

说明：返回当前 **`draft`** 版本下未逻辑删除的模块列表，按 `sortOrder` 升序。无 `draft` 或存在 `pending` 且无 `draft` 时返回空列表或 409（与实现约定一致，写操作一律 409）。

响应 `data.list[]` 字段：

- id
- moduleCode
- moduleName
- moduleType
- icon
- color
- layoutType
- isVisible（boolean）
- sortOrder
- targetType
- targetValue

**不得** 返回审计字段、凭据或内部数据库字段。

#### POST /api/admin/home/modules

权限：`home:module:create`

说明：在当前 `draft` 版本下新增模块。存在 `pending` 且无 `draft` 时返回 **409**。

请求体：

- moduleCode（string，必填，版本内唯一）
- moduleName（string，必填）
- moduleType（string，必填）
- icon（string，可选）
- color（string，可选）
- layoutType（string，可选）
- isVisible（boolean，默认 true）
- sortOrder（int，可选）
- targetType（string，必填，如 route / content / external）
- targetValue（string，必填）

#### PUT /api/admin/home/modules/sort

权限：`home:module:sort`

说明：批量更新当前 `draft` 版本内模块排序。存在 `pending` 且无 `draft` 时返回 **409**。

请求体：

```json
{
  "items": [
    { "id": "模块 UUID", "sortOrder": 1 },
    { "id": "模块 UUID", "sortOrder": 2 }
  ]
}
```

约束：

- `items` 不得为空；`id` 必须属于当前 `draft` 版本；`sortOrder` 从 1 起连续或允许间断由实现约定，但须唯一。
- 不得包含已逻辑删除模块。

#### PUT /api/admin/home/modules/:id

权限：`home:module:update`

说明：更新当前 `draft` 版本下的模块。存在 `pending` 且无 `draft` 时返回 **409**。

请求体：同 POST，字段均可选（部分更新）。

#### DELETE /api/admin/home/modules/:id

权限：`home:module:delete`

说明：逻辑删除（写 `deleted_at`），仅允许操作当前 `draft` 版本下的模块。存在 `pending` 且无 `draft` 时返回 **409**。

### 管理端 — 审核发布

首页配置使用第八章统一发布接口：

- POST /api/admin/publish/home_config/:bizId/submit
- POST /api/admin/publish/home_config/:bizId/approve
- POST /api/admin/publish/home_config/:bizId/reject
- POST /api/admin/publish/home_config/:bizId/direct-publish
- POST /api/admin/publish/home_config/:bizId/withdraw
- POST /api/admin/publish/home_config/:bizId/rollback
- GET /api/admin/publish/home_config/:bizId/records

`bizId` 为 `home_config.id`（UUID）。`rollback` 请求体需包含 `versionId`（历史版本 UUID）。

发布状态（varchar）：`draft`、`pending`、`published`、`rejected`、`withdrawn`、`archived`。

### 版本可编辑性

- 仅 `draft` 允许编辑版本正文与关联模块。
- `pending`、`published`、`rejected`、`withdrawn`、`archived` 正文与模块不可修改；仅允许通过发布流程更新 `status`。
- 历史版本不得删除或覆盖；同一配置最多同时存在一个 `draft` 与一个 `pending`。

### 主表与版本状态机

| 操作 | home_config | home_config_version | current_version_id |
|---|---|---|---|
| `PUT` 保存草稿 | 见 §十 `PUT` 规则 | 更新/新建 `draft` | 不变 |
| 提交审核 | 无已发布：`draft`/`rejected`→`pending`；有 `currentVersionId`：**保持 `published`** | `draft`→`pending` | 不变 |
| 审核通过 / 直接发布 | → `published` | 目标版本→`published` | 更新为新版本 |
| 驳回 | 无已发布：→`rejected`；有 `currentVersionId`：**保持 `published`** | `pending`→`rejected` | 不变 |
| 撤回 | → `withdrawn` | 当前生效版本→`withdrawn` | **清空** |
| `withdrawn` 下创建/提交/驳回 | **保持 `withdrawn`** | 新建/流转版本状态 | 不变，直至再发布 |
| 回滚 | **不变** | 复制历史版本及模块为新 `draft` | **不变** |

补充语义：

- 新版本发布：更新 `current_version_id`；历史 `published` 版本 **保留**，不自动改为 `withdrawn`。
- 回滚产物为 `draft`，须再次审核或直接发布方生效。

### 群众端

#### GET /api/public/home/config

说明：返回群众端首页所需配置，由后端 **组合** 以下来源：

1. 当前 **已发布** 首页版本（`home_config.status=published` 且 `current_version_id` 有效）
2. 该版本下可见的 `home_module`（`is_visible=1` 且未逻辑删除）
3. `guide_item_config` 中 `is_visible=1` 且（`is_hot=1` 或 `is_recommend=1`）的高频事项
4. 已发布 `content_item`（`content_type=notices`，`status=published`）的摘要列表（条数上限由实现约定，如 5 条）

**不得** 返回：`draft`、`pending`、`rejected`、`withdrawn`、`archived` 版本或模块；`createdBy`、`updatedBy` 等审计字段；凭据、权限信息、共享平台参数或内部数据库字段。

成功响应 `data` 字段：

- title（string）
- subtitle（string，可空）
- idleSeconds（int，来自系统参数或默认 90）
- bannerLines（string[]，由 `topBannerJson` 映射）
- theme（object，由 `themeJson` 映射，不含内部键名）
- modules（array）
  - moduleCode
  - moduleName
  - moduleType
  - icon
  - color
  - layoutType
  - targetType
  - targetValue
- homeHotItems（array，来自 `guide_item_config`）
  - itemId（platform_item_id 映射）
  - name（display_name 或 item_name）
- noticeSummaries（array，来自已发布通知公告）
  - id
  - title
  - summary
  - publishAt
- nav（array，固定或由系统参数提供）
  - label
  - to

#### 无已发布配置

当不存在满足条件的已发布首页配置时：

- HTTP 状态码：**503**
- 响应信封 `code`：**503**
- `message`：服务暂不可用类友好文案
- `data`：`null`

**禁止** 返回示例政务事项或开发 mock 数据。群众端捕获 **HTTP 503** 或信封 `code=503` 后，应使用 **本地离线配置** 兜底展示。

---

## 十一、窗口导航接口

### 管理端

#### 楼层

- GET /api/admin/navigation/floors
- POST /api/admin/navigation/floors
- PUT /api/admin/navigation/floors/:id
- DELETE /api/admin/navigation/floors/:id

#### 区域

- GET /api/admin/navigation/areas
- POST /api/admin/navigation/areas
- PUT /api/admin/navigation/areas/:id
- DELETE /api/admin/navigation/areas/:id

#### 窗口

- GET /api/admin/navigation/windows
- POST /api/admin/navigation/windows
- PUT /api/admin/navigation/windows/:id
- DELETE /api/admin/navigation/windows/:id

### 群众端

- GET /api/public/navigation/floors
- GET /api/public/navigation/floors/:id
- GET /api/public/navigation/areas
- GET /api/public/navigation/windows

---

## 十二、宣传展示接口

### 管理端

- GET /api/admin/showcase/items
- POST /api/admin/showcase/items
- GET /api/admin/showcase/items/:id
- PUT /api/admin/showcase/items/:id
- DELETE /api/admin/showcase/items/:id

### 群众端

- GET /api/public/showcase/items
- GET /api/public/showcase/items/:id

支持类型：

- pioneer
- model_worker
- civilization
- topic

---

## 十三、文件接口

### 管理端上传

POST /api/admin/files/upload

说明：

用于上传图片。

限制：

- 类型白名单
- 大小限制
- 存储到服务器本地目录
- 后续预留对象存储

### 文件访问

GET /api/public/files/:id

---

## 十四、群众端政务公开接口

### 政策文件

- GET /api/public/content/policies
- GET /api/public/content/policies/:id

### 政策解读

- GET /api/public/content/interpretations
- GET /api/public/content/interpretations/:id

### 信息公开

- GET /api/public/content/open-guide
- GET /api/public/content/open-system
- GET /api/public/content/open-catalog
- GET /api/public/content/annual-reports

### 机构职能

- GET /api/public/content/organizations
- GET /api/public/content/organizations/:id

### FAQ

- GET /api/public/content/faqs
- GET /api/public/content/faqs/:id

### 通知公告

- GET /api/public/content/notices
- GET /api/public/content/notices/:id

---

## 十五、群众端办事指南接口

群众端不得直接调用大数据共享平台。

必须调用本系统后端。

### 获取对外展示部门

GET /api/public/service-guide/depts

### 获取主题分类

GET /api/public/service-guide/themes

### 按部门获取事项类型

GET /api/public/service-guide/depts/:deptCode/item-types

### 按主题获取事项类型

GET /api/public/service-guide/themes/:themeCode/item-types

### 获取事项列表

GET /api/public/service-guide/items

查询参数：

- deptCode
- themeCode
- itemTypeCode
- page
- pageSize

### 获取事项详情

GET /api/public/service-guide/items/:itemId

返回结构必须统一为：

- basicInfo
- acceptConditions
- materials
- processSteps
- locations
- workTime
- timeLimit
- fee
- legalBasis
- consultationPhone
- complaintPhone
- relatedPolicies
- relatedFaqs

字段为空时，群众端显示：

暂无相关信息

---

## 十六、统计接口

### 群众端上报

POST /api/public/stats/page-view

POST /api/public/stats/click

要求：

- 不采集身份证
- 不采集手机号
- 不采集人脸
- 不采集个人敏感信息

### 管理端统计查询

- GET /api/admin/stats/overview
- GET /api/admin/stats/hot-items
- GET /api/admin/stats/hot-modules
- GET /api/admin/stats/page-paths
- GET /api/admin/stats/api-logs

---

## 十七、缓存与兜底接口

### 群众端离线数据包

GET /api/public/cache/offline-package

返回：

- 首页配置
- 政策公开摘要
- FAQ
- 窗口导航
- 宣传展示
- 通知公告

### 办事指南缓存策略

服务端内部实现：

- 实时调用成功后更新 guide_api_cache
- 调用失败时读取最后一次有效缓存
- 无缓存时返回服务暂不可用

---

## 十八、安全要求

- 管理端接口必须鉴权
- 群众端接口只读
- 群众端不得调用 admin 接口
- 群众端不得直接调用大数据共享平台
- 不得在前端暴露共享平台凭据
- 日志中不得记录敏感个人信息
- 写操作必须记录操作日志
- 发布操作必须记录发布记录

---

## 十九、接口开发优先级

### P0

- 登录认证
- 用户角色权限
- 内容管理
- 审核发布
- 办事指南配置
- 办事指南群众端查询
- 首页配置
- 群众端首页接口

### P1

- 窗口导航
- 宣传展示
- 图片上传
- 统计分析
- 离线数据包

### P2

- AI问答
- 智能预约
- 办件查询
- 统一认证深度对接
