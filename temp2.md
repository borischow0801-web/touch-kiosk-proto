继续在项目中创建 Claude Code slash commands：

- .claude/commands/project-scan.md
- .claude/commands/implement-module.md
- .claude/commands/review-safety.md

内容如下。

文件：.claude/commands/project-scan.md

```md
---
description: Scan the current project and produce a structured takeover report.
allowed-tools: Read, Glob, Grep, Bash
---

# Project Scan

请扫描当前项目结构，输出《项目接管分析报告》。

必须包含：

1. 当前目录结构
2. 前端工程识别
3. 后端工程识别
4. package.json 脚本识别
5. 数据库/ORM/迁移文件识别
6. 部署文件识别
7. 已实现功能
8. 可复用代码
9. 需要重构的代码
10. 下一步建议开发顺序

不要修改文件。

-----

文件：.claude/commands/implement-module.md

---
description: Implement one backend/frontend module incrementally with verification.
allowed-tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash
---

# Implement Module

目标模块：

$ARGUMENTS

请按以下步骤执行：

1. 先扫描与该模块相关的已有代码。
2. 输出简短实施计划。
3. 只修改与本模块直接相关的文件。
4. 遵守项目 CLAUDE.md 和相关 skills。
5. 后端模块需包含 controller、service、dto、entity、module。
6. 前端模块需包含 route、api、page、components。
7. 修改后运行可用的类型检查、构建或测试。
8. 最后输出：
   - 改动文件
   - 新增接口
   - 验证命令
   - 后续 TODO

-----


文件：.claude/commands/review-safety.md


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


-----


