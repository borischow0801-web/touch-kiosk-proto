# 政务公开触摸查询系统

# 数据库设计说明书（database.md）

版本：V1.0

---

# 一、数据库设计原则

## 1.1 数据库环境

开发环境：

- MySQL 8

生产环境：

- HighGo（瀚高数据库）

设计原则：

- 优先兼容 MySQL 与 HighGo
- 避免使用数据库专属特性
- 避免使用存储过程
- 避免使用触发器
- 避免使用数据库 ENUM
- 避免依赖 JSON 类型

---

## 1.2 主键设计

所有业务表：

主键统一：

id

类型：

varchar(36)

生成方式：

后端 UUID

禁止：

- 自增主键
- 雪花算法依赖数据库

---

## 1.3 公共字段规范

所有业务表统一包含：

created_at

创建时间

updated_at

更新时间

deleted_at

逻辑删除时间

采用逻辑删除。

---

## 1.4 布尔标志字段

跨 MySQL 8 与 HighGo 的 0/1 标志字段（如 `is_top`、`is_recommend`）统一使用：

- 类型：`smallint`
- 取值：仅允许 `0` 或 `1`

禁止使用 `tinyint`（HighGo/PostgreSQL 驱动不兼容）及数据库 `BOOLEAN` 类型。

---

# 二、系统用户与权限模型

采用 RBAC 模型。

## 角色

### 超级管理员

系统最高权限

### 内容编辑员

内容维护

### 审核发布员

审核发布

---

## 用户权限相关表

### sys_user

用户表

字段：

- id
- username
- password_hash
- real_name
- mobile
- email
- status
- last_login_at
- created_at
- updated_at
- deleted_at

---

### sys_role

角色表

字段：

- id
- role_code
- role_name
- description
- status
- created_at
- updated_at
- deleted_at

---

### sys_user_role

用户角色关联表

字段：

- id
- user_id
- role_id
- created_at

---

### sys_permission

权限表

字段：

- id
- permission_code
- permission_name
- module_code
- permission_type
- sort_order
- created_at
- updated_at

---

### sys_role_permission

角色权限表

字段：

- id
- role_id
- permission_id
- created_at

---

# 三、内容管理模型

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

---

## content_category

内容分类表

字段：

- id
- parent_id
- category_name
- content_type
- sort_order
- status
- created_at
- updated_at
- deleted_at

---

## content_item

内容主表

字段：

- id
- content_type
- title
- subtitle
- summary
- category_id
- cover_file_id
- current_version_id
- status
- is_top（smallint，0/1）
- is_recommend（smallint，0/1）
- sort_order
- publish_at
- source_type
- source_url
- created_by
- updated_by
- created_at
- updated_at
- deleted_at

---

## content_version

内容版本表

字段：

- id
- content_id
- version_no
- title
- summary
- body
- extra_json
- status
- change_remark
- created_by
- created_at

---

## content_relation

内容关联表

用于：

- 政策文件关联政策解读
- 办事指南关联FAQ
- 办事指南关联政策文件

字段：

- id
- source_id
- target_id
- relation_type
- sort_order
- created_at

---

# 四、审核发布模型

统一审核流程：

草稿
→ 待审核
→ 已发布
→ 已撤回

---

## publish_record

审核发布记录表

字段：

- id
- biz_type
- biz_id
- version_id
- action
- from_status
- to_status
- comment
- operator_id
- operated_at

---

# 五、办事指南配置模型

说明：

办事指南真实数据来源于大数据共享平台接口。

本系统不维护事项详情。

仅维护展示配置。

---

## guide_dept_mapping

部门映射表

字段：

- id
- dept_name
- dept_code
- display_name
- icon
- floor_text
- area_text
- is_visible
- sort_order
- status
- created_at
- updated_at
- deleted_at

---

## guide_theme_mapping

主题映射表

字段：

- id
- theme_name
- theme_code
- platform_param_json
- icon
- is_visible
- sort_order
- created_at
- updated_at
- deleted_at

---

## guide_item_config

事项展示配置表

字段：

- id
- platform_item_id
- item_name
- display_name
- dept_code
- theme_code
- is_hot
- is_recommend
- is_visible
- sort_order
- related_policy_ids
- related_faq_ids
- created_at
- updated_at
- deleted_at

---

## guide_api_cache

接口缓存表

字段：

- id
- cache_key
- api_name
- request_param
- response_body
- success_at
- expire_at
- created_at
- updated_at

---

# 六、首页配置模型

说明：

- 一期仅维护 **一条逻辑首页配置**，`config_name` 固定为 `default`。
- 主键 `id` 由后端生成 UUID v4，**不得**使用固定非 UUID 主键。
- 首页布局与展示内容通过 **版本表 + 模块表** 管理；高频事项 **不** 写入首页版本快照，由 `guide_item_config` 独立维护。
- 状态字段、JSON 配置字段遵循本文 §1.2、§1.3 约定（`varchar` 状态、`text` 存序列化 JSON）。

---

## home_config

首页配置主表（逻辑单例）

字段：

- id（varchar(36)，UUID 主键）
- config_name（varchar，一期固定值 `default`）
- status（varchar：draft / pending / published / rejected / withdrawn / archived）
- current_version_id（varchar(36)，可空；指向当前生效的 **已发布** 版本）
- created_by
- updated_by
- created_at
- updated_at
- deleted_at

约束：

- 一期仅允许存在一条未删除的 `config_name = default` 记录；**逻辑单例由应用层事务检查保证**，不使用数据库部分唯一索引，不引入 MySQL 或 HighGo 专属约束。
- `current_version_id` 仅在发布成功时更新；撤回时必须清空。
- 主表 **不** 存储 `title`、`subtitle`、`top_banner_json`、`theme_json`（这些字段归属版本表）。

### 主表状态机

| 场景 | home_config.status | current_version_id |
|---|---|---|
| 首次创建草稿（`PUT /api/admin/home/config`） | `draft` | 不变（空） |
| 无已发布版本时保存/更新草稿 | `draft` | 不变（空） |
| 无已发布版本时提交审核 | `draft` 或 `rejected` → `pending` | 不变 |
| 存在 `current_version_id` 时隐式创建草稿、保存草稿、提交审核、驳回 | **保持 `published`** | 不变 |
| 审核通过或直接发布 | → `published` | 更新为新版本 id |
| 撤回 | → `withdrawn` | **清空** |
| `withdrawn` 状态下创建草稿、提交审核或驳回 | **保持 `withdrawn`** | 不变，直至新版本发布 |
| 从 `withdrawn` 审核通过或直接发布 | → `published` | 更新为新版本 id |
| 回滚 | **不变**（保持当前 status 与指针） | **不变** |

---

## home_config_version

首页配置版本表（只追加，不物理删除）

字段：

- id（varchar(36)，UUID 主键）
- home_config_id（varchar(36)）
- version_no（int，由应用分配递增序号，非自增主键）
- title
- subtitle
- top_banner_json（text，序列化顶部展示区配置）
- theme_json（text，序列化主题样式配置）
- status（varchar：draft / pending / published / rejected / withdrawn / archived）
- change_remark
- created_by
- created_at

约束：

- 同一 `home_config_id` 下 `(home_config_id, version_no)` 唯一。
- 同一 `home_config_id` 下 **最多同时存在一个 `draft` 和一个 `pending`**。
- **仅 `draft` 状态** 允许编辑版本正文（`title`、`subtitle`、`top_banner_json`、`theme_json`）及关联 `home_module` 的增删改排。
- **`pending`、`published`、`rejected`、`withdrawn`、`archived`** 版本正文与模块 **不可修改**；仅允许通过发布流程更新版本 `status`。
- 历史版本 **不得** 删除或覆盖（只追加）。
- 新版本发布时：更新 `home_config.current_version_id` 指向新版本；**历史 published 版本保留 published 状态**，不自动改为 withdrawn。

### 草稿创建与编辑（唯一入口）

基础配置编辑 **仅** 通过 `PUT /api/admin/home/config`（见 `api-spec.md` §十），规则如下：

| 条件 | 行为 |
|---|---|
| 已存在 `draft` | 更新该 `draft` 正文 |
| 不存在 `draft` 且存在 `current_version_id` | 事务内复制当前已发布版本 **及其模块** 生成新 `draft`，再应用本次更新 |
| 首次使用（主表不存在） | 事务内创建 UUID 主表（`status=draft`）与 `version_no=1` 的 `draft`，再应用更新 |
| 已存在 `pending` 版本 | 返回 **409**，禁止创建或编辑 `draft` |

模块 CRUD 与排序仅作用于当前 `draft`；存在 `pending` 且无 `draft` 时，模块写操作同样返回 **409**。

---

## home_module

首页模块表（归属于版本，非主表）

字段：

- id（varchar(36)，UUID 主键）
- home_config_version_id（varchar(36)，归属某一配置版本）
- module_code
- module_name
- module_type
- icon
- color
- layout_type
- is_visible（smallint，0/1）
- sort_order
- target_type
- target_value
- created_at
- updated_at
- deleted_at

约束：

- **不得** 使用 `home_config_id` 直接关联主表；模块必须挂靠在某一 `home_config_version` 下。
- 管理端模块 CRUD 仅作用于 **当前可编辑草稿版本**（通常为最新 `draft`）。
- 创建新草稿版本时：从源版本（已发布版本或指定历史版本）**复制模块行** 到新版本；草稿模块的增删改 **不得** 影响已发布版本下的模块数据。
- 逻辑删除通过 `deleted_at`；查询时过滤已删除模块。

---

## 首页配置与发布记录

- 所有首页发布操作写入 `publish_record`。
- `biz_type` 固定为 `home_config`。
- `biz_id` 为 `home_config.id`。
- `version_id` 为 `home_config_version.id`。

### 状态变化约定

| 操作 | home_config | home_config_version | current_version_id |
|---|---|---|---|
| 保存草稿（`PUT`） | 见上文主表状态机 | 更新/新建 `draft` 及模块 | 不变 |
| 提交审核 | 无已发布：`draft`/`rejected`→`pending`；有 `current_version_id`：**保持 `published`** | `draft` → `pending` | 不变 |
| 审核通过 / 直接发布 | → `published` | 目标版本 → `published` | 更新为新版本 id |
| 驳回 | 无已发布：→`rejected`；有 `current_version_id`：**保持 `published`** | `pending` → `rejected` | 不变 |
| 撤回 | → `withdrawn` | 当前生效版本 → `withdrawn` | **清空（null）** |
| `withdrawn` 下创建/提交/驳回 | **保持 `withdrawn`** | 新建/流转 `draft`/`pending`/`rejected` | 不变，直至再发布 |
| 回滚 | **不变** | 复制历史版本及模块为新 `draft` | **不变** |

回滚不产生即时线上变更；回滚产物为 **draft**，须经审核或直接发布后方可生效。

### 群众端不可用语义

当不存在满足条件的已发布首页配置（如 `status` 非 `published`、`current_version_id` 为空或无效）时，Public Home API 返回 **HTTP 503**，响应信封 `code=503`、`data=null`；群众端捕获后使用本地离线配置，**不得** 由服务端返回开发 mock 或示例政务事项。

---

## 首页配置与办事指南配置边界

| 职责 | 模块 / 表 |
|---|---|
| 首页标题、副标题、顶部横幅、主题样式、模块卡片布局 | `HomeConfigModule` / `home_config_version` + `home_module` |
| 高频事项、首页推荐事项（`is_hot`、`is_recommend`） | `GuideConfigModule` / `guide_item_config` |
| 已发布通知公告摘要（首页展示用） | `ContentModule` / `content_item`（published） |

群众端 Public Home API 由后端 **组合读取** 上述来源，详见 `api-spec.md` 第十章。无已发布配置时返回 **HTTP 503**（信封 `code=503`、`data=null`）。

---

# 七、窗口导航模型

## nav_floor

楼层表

## nav_area

区域表

## nav_window

窗口表

用于：

- 楼层
- 区域
- 窗口
- 业务范围
- 咨询电话
- 服务时间

---

# 八、宣传展示模型

## showcase_item

支持：

- 模范先锋岗
- 服务标兵
- 优秀工作人员
- 文明大厅展示
- 专题宣传

字段：

- id
- showcase_type
- title
- subtitle
- person_name
- position_name
- summary
- body
- cover_file_id
- image_file_ids
- is_home_recommend
- sort_order
- status
- current_version_id
- created_by
- updated_by
- created_at
- updated_at
- deleted_at

---

# 九、文件资源模型

## file_asset

字段：

- id
- original_name
- stored_name
- file_ext
- mime_type
- file_size
- storage_type
- storage_path
- public_url
- uploader_id
- created_at
- deleted_at

---

# 十、统计分析模型

## stat_page_view

页面访问记录

## stat_click_event

点击事件记录

## stat_api_log

接口调用日志

---

# 十一、系统日志模型

## sys_operation_log

操作日志

## sys_login_log

登录日志

## sys_param

系统参数

---

# 十二、一期核心关系图

用户
↓
角色
↓
权限

内容
↓
版本
↓
发布记录

办事指南配置
↓
共享平台接口

首页配置
↓
版本（home_config_version）
↓
模块（home_module）
↓
发布记录

首页高频事项
↓
guide_item_config（is_hot / is_recommend）

宣传展示
↓
首页推荐（showcase is_home_recommend）

窗口导航
↓
大厅导览

统计日志
↓
运营分析

---

# 十三、二期预留

暂不建设：

- AI问答
- 办件查询
- 智能预约
- 数字人
- 打印
- 扫码
- 设备管理

后续扩展时新增表设计。
