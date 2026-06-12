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

### 管理端

- GET /api/admin/home/config
- PUT /api/admin/home/config
- GET /api/admin/home/modules
- POST /api/admin/home/modules
- PUT /api/admin/home/modules/:id
- DELETE /api/admin/home/modules/:id
- PUT /api/admin/home/modules/sort

### 群众端

GET /api/public/home/config

说明：

返回群众端首页所需配置：

- 标题
- 副标题
- 顶部展示区
- 首页模块
- 高频事项
- 通知公告
- 主题样式

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
