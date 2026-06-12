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

## home_config

首页配置表

字段：

- id
- config_name
- title
- subtitle
- top_banner_json
- theme_json
- status
- current_version_id
- created_by
- updated_by
- created_at
- updated_at
- deleted_at

---

## home_module

首页模块表

字段：

- id
- home_config_id
- module_code
- module_name
- module_type
- icon
- color
- layout_type
- is_visible
- sort_order
- target_type
- target_value
- created_at
- updated_at

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
群众端首页

宣传展示
↓
首页推荐

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
