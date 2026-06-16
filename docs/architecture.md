# 政务公开触摸查询系统

# 系统架构设计说明书（architecture.md）

版本：V1.0

---

## 一、项目定位

本项目为政务服务大厅竖屏触摸查询系统。

系统一期建设目标：

- 群众端匿名公开查询
- 管理端内容维护
- 内容审核发布
- 办事指南接口适配
- 政策公开
- 窗口导航
- 常见问题
- 通知公告
- 宣传展示
- 点击量与访问路径统计

一期不做：

- 群众身份认证
- 个人办件查询
- 智能预约
- AI 智能问答
- 打印
- 扫码
- 设备管理

后续预留：

- AI 智能问答
- 智能预约
- 办件查询
- 统一认证
- 对象存储
- 数据分析

---

## 二、总体工程结构

系统采用三工程结构：

- kiosk-app：群众端安卓 APK
- admin-web：管理端 Web
- backend：统一后端服务

推荐目录：

```text
touch-kiosk-system/
├── kiosk-app
├── admin-web
├── backend
└── docs
```

---

## 三、技术栈

### 群众端 kiosk-app

- Vue3
- TypeScript
- Vite
- Pinia
- Capacitor
- Android APK

要求：

- 1080 × 1920 竖屏适配
- 全屏沉浸
- 不唤起系统键盘
- 所有操作点击完成
- 中下部作为主要触控区
- 支持离线缓存与接口失败兜底

### 管理端 admin-web

- Vue3
- TypeScript
- Vite
- Element Plus
- Pinia

用于：

- 内容管理
- 审核发布
- 首页配置
- 办事指南配置
- 窗口导航
- 宣传展示
- 统计分析
- 系统管理

### 后端 backend

- NestJS
- TypeScript
- JWT
- RBAC
- TypeORM 或兼容 MySQL / HighGo 的 ORM
- 开发环境 MySQL 8
- 生产环境 HighGo 瀚高数据库

---

## 四、系统边界

一期采用：

- 匿名公开查询
- 管理端账号密码登录
- 内容审核发布
- 内容版本管理
- 办事指南实时接口调用
- 群众端离线缓存
- 管理端与群众端接口分离

---

## 五、后端模块划分

后端模块包括：

### AuthModule

负责：

- 管理端登录
- JWT 签发
- 登录状态校验
- 登录日志
- 统一认证预留

### SystemModule

负责：

- 用户管理
- 角色管理
- 权限管理
- 系统参数
- 操作日志

### ContentModule

负责本地内容管理：

- 政策文件
- 政策解读
- 信息公开指南
- 信息公开制度
- 主动公开目录
- 年度报告
- 机构职能
- FAQ
- 通知公告

### PublishModule

负责：

- 草稿
- 提交审核
- 审核通过
- 驳回
- 直接发布
- 撤回
- 版本回滚
- 发布记录

### GuideConfigModule

负责办事指南展示配置：

- 对外展示部门
- 部门编码映射
- 主题分类
- 主题接口参数映射
- 高频事项
- 首页推荐（通过 `guide_item_config.is_hot`、`is_recommend` 控制，**不**写入 `home_config_version`）
- 事项别名
- 关联政策
- 关联 FAQ

### ServiceGuideModule

负责：

- 调用大数据共享平台接口
- 字段转换
- 超时控制
- 异常处理
- 最后一次有效数据缓存
- 统一输出群众端可展示数据

### HomeConfigModule

负责：

- 首页配置主表与版本管理（逻辑单例 `config_name=default`）
- 群众端首页模块配置（`home_module` 归属 `home_config_version`）
- 顶部展示区配置（`top_banner_json`）
- 首页卡片排序
- 图标与布局
- 主题色（`theme_json`）
- 与 `PublishModule` 对接的首页审核发布

**不负责**：高频事项数据维护（归属 `GuideConfigModule`）；通知公告正文（归属 `ContentModule`）。

Public Home API 在本模块内 **组合输出**：已发布首页版本 + 该版本模块 + 可见高频事项 + 已发布通知公告摘要。

### NavigationModule

负责：

- 楼层
- 区域
- 窗口
- 平面图
- 业务范围
- 服务时间
- 咨询电话

### ShowcaseModule

负责：

- 模范先锋岗
- 服务标兵
- 优秀工作人员
- 文明大厅展示
- 专题宣传

### FileModule

负责：

- 图片上传
- 本地目录存储
- 文件访问
- 后续对象存储预留

### PublicApiModule

负责群众端公开接口：

- 不需要登录
- 不返回后台字段
- 不暴露共享平台接口参数
- 不暴露共享平台凭据

### AdminApiModule

负责管理端接口：

- 必须登录
- 必须鉴权
- 写操作记录操作日志

### StatsModule

负责：

- 页面访问
- 点击事件
- 热门事项
- 访问路径
- 接口调用日志

### CacheModule

负责：

- 首页缓存
- 政策公开缓存
- FAQ 缓存
- 窗口导航缓存
- 宣传展示缓存
- 办事指南最后一次有效数据缓存

### CommonModule

负责：

- 统一响应
- 错误码
- DTO
- 参数校验
- 异常过滤器
- 拦截器
- 通用工具

---

## 六、群众端设计边界

群众端首页采用：

- 顶部展示区
- 中下部模块化卡片
- 底部固定导航

首页模块包括：

- 高频事项（运行时读取 `guide_item_config`，非首页版本快照）
- 按部门查
- 按主题查
- 政策公开
- 窗口导航
- 常见问题
- 通知公告
- 模范先锋岗

其中 **模块卡片布局与可见性** 由已发布 `home_config_version` + `home_module` 决定；**高频事项列表** 由 `GuideConfigModule` 提供；**通知公告摘要** 由已发布 `content_item` 提供。

群众端在无已发布首页配置时，Public API 返回 **HTTP 503**（响应信封 `code=503`、`data=null`）；群众端捕获后使用本地离线配置兜底，**不得** 由服务端返回示例政务事项或开发 mock 数据。

群众端禁止：

- 输入框搜索
- 系统键盘
- 直接调用共享平台接口
- 暴露后台接口字段

群众端允许：

- 热门词点击
- 分类筛选
- 拼音首字母
- 部门选择
- 主题选择
- 大卡片列表

---

## 七、办事指南调用架构

调用链路：

群众端 APK
→ 本系统后端 Public API
→ ServiceGuideModule
→ 大数据共享平台接口
→ 字段转换
→ 缓存兜底
→ 群众端展示

办事指南不做全量同步，不做定时同步。

查询路径：

按部门：

部门
→ 事项类型
→ 事项列表
→ 事项详情

按主题：

主题
→ 事项类型
→ 事项列表
→ 事项详情

---

## 八、审核发布架构

所有可发布内容共用审核发布机制。

状态包括：

- draft
- pending
- published
- rejected
- withdrawn
- archived

支持：

- 直接发布
- 提交审核后发布
- 撤回
- 回滚
- 版本记录

### 首页配置发布（home_config）

与内容发布共用 `/api/admin/publish/home_config/:bizId/*` 接口，`biz_id` 为逻辑单例 `home_config.id`（`config_name=default`，UUID 主键；单例由 **应用层事务** 保证，不使用数据库部分唯一索引）。

- 版本数据存于 `home_config_version`；模块存于 `home_module`（FK 为 `home_config_version_id`）。
- 基础配置编辑 **唯一入口**：`PUT /api/admin/home/config`（隐式创建/更新 `draft`；存在 `pending` 时返回 409）。
- 管理端模块 CRUD 与排序仅作用于当前 **`draft`** 版本，不影响已发布版本。
- **版本可编辑性**：仅 `draft` 正文与模块可改；`pending`/`published`/`rejected`/`withdrawn`/`archived` 仅允许状态流转；同一配置最多一个 `draft` 与一个 `pending`。
- **主表状态机**：
  - 首次创建草稿 → `home_config.status = draft`
  - 无已发布版本时提交审核 → `draft`/`rejected` → `pending`
  - 存在 `current_version_id` 时，隐式创建草稿、提交审核、驳回 → 主表 **保持 `published`**
  - 审核通过/直接发布 → 主表 `published`，更新 `current_version_id`
  - 撤回 → 主表与当前生效版本 `withdrawn`，`current_version_id` 清空
  - `withdrawn` 下创建/提交/驳回 → 主表 **保持 `withdrawn`**，直至新版本发布
  - 回滚 → 仅复制历史版本及模块为新 `draft`，**不改变** 主表状态与 `current_version_id`
- 发布成功：更新 `current_version_id`；历史 `published` 版本 **保留** 原状态。
- 高频事项 **不** 纳入版本快照，Public 层运行时组合 `guide_item_config`。
- Public Home API 无已发布配置时：**HTTP 503**，信封 `code=503`、`data=null`。
- 路由实现：`PUT /modules/sort` 须 **优先于** `PUT /modules/:id` 注册或匹配。

---

## 九、数据库架构原则

开发环境：

- MySQL 8

生产环境：

- HighGo 瀚高数据库

原则：

- 主键 varchar(36)
- 后端生成 UUID
- 不用自增主键
- 不用 enum
- 不依赖 JSON 数据库类型
- JSON 配置使用 text
- 使用逻辑删除
- 尽量标准 SQL

---

## 十、部署架构

推荐：

- Nginx 统一入口
- admin-web 静态资源
- backend API 服务
- kiosk-app APK 访问后端 Public API
- 图片文件本地目录存储
- 后续可迁移对象存储

---

## 十一、后续扩展预留

后续扩展模块：

- AI问答模块
- 预约模块
- 办件查询模块
- 统一认证模块
- 对象存储模块
- 数据分析模块

一期不得提前实现这些复杂业务，只保留架构扩展口。
