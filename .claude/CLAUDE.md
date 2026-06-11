# Claude Code Project Rules

## Project

本项目是“政务公开触摸查询系统”。

系统由三部分组成：

- kiosk-app：群众端安卓 APK，Vue3 + Vite + Capacitor
- admin-web：管理端 Web，Vue3 + Vite + Element Plus
- backend：后端服务，NestJS + TypeScript

## Phase 1 Scope

一期只做：

- 匿名公开查询
- 管理端登录
- 内容管理
- 审核发布
- 版本管理
- 首页配置
- 办事指南展示配置
- 大数据共享平台办事指南接口适配
- 窗口导航
- 常见问题
- 通知公告
- 政策公开
- 宣传展示
- 点击量、热门事项、访问路径、日志统计
- 群众端离线缓存和最后一次有效数据兜底

一期不做：

- 群众身份认证
- 个人办件查询
- 真实预约取号
- AI 智能问答
- 打印
- 扫码
- 设备管理

## Non-negotiable Constraints

1. 群众端不得唤起系统键盘。
2. 群众端不得设计需要输入内容的搜索框。
3. 群众端使用热门词、分类筛选、拼音首字母、部门、主题等点选式查询。
4. 群众端首页顶部约 30% 只做展示，不放核心操作。
5. 群众端主要操作集中在中下部。
6. 管理端接口和群众端接口必须分离。
7. 群众端不得直接调用大数据共享平台接口。
8. 办事指南真实详情不落本系统全量库，由后端实时调用共享平台接口。
9. 开发环境 MySQL，生产环境瀚高数据库，数据库设计必须兼容迁移。
10. 所有可发布内容必须支持状态流转和版本管理。

## Recommended Workflow

Before coding:

1. Read existing project structure.
2. Identify reusable code.
3. Identify incompatible code.
4. Propose a small implementation plan.
5. Modify files incrementally.
6. After changes, run type checks/build/tests when available.
7. Summarize changed files and verification results.

## Database Rules

- Primary keys use varchar(36), generated UUID from backend.
- Do not rely on auto-increment IDs.
- Use varchar status fields instead of enum.
- Use tinyint/smallint for booleans.
- Store JSON as text for MySQL/HighGo compatibility.
- Avoid MySQL-specific SQL features.
- Use logical delete via deleted_at.
- Include created_at and updated_at for business tables.

## API Rules

- Admin API prefix: /api/admin/*
- Public API prefix: /api/public/*
- Shared platform adapter must not leak platform credentials or raw platform params to kiosk-app.
- Public API responses should be stable, clean, and presentation-ready.
- Do not return admin-only fields to kiosk-app.

## UI Rules

- kiosk-app: touch-first, large cards, large fonts, no keyboard.
- admin-web: dense management UI is acceptable; use Element Plus.
- All kiosk operations should be doable by clicking/tapping.
