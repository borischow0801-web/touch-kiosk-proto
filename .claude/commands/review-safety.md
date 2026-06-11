---
description: Review current changes for business boundary, security, DB compatibility, and kiosk UI constraints.
allowed-tools: Read, Glob, Grep, Bash
---

# Review Safety

请审查当前改动是否违反项目关键约束。

重点检查：

1. 群众端是否出现输入框或键盘唤起风险。
2. 群众端是否直接调用大数据共享平台。
3. 管理端接口和群众端接口是否混用。
4. 是否泄露平台接口凭据。
5. 数据库设计是否使用 auto increment、enum、JSON 类型等兼容风险。
6. 是否绕过审核发布和版本机制。
7. public API 是否返回后台字段。
8. 是否记录了敏感个人信息。
9. 是否缺少错误处理和兜底提示。

只输出审查报告，不要修改文件。
