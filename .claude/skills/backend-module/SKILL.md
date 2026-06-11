---
name: backend-module
description: Use this skill when creating or refactoring NestJS backend modules for this政务公开触摸查询系统.
---

# Backend Module Skill

When implementing backend modules, follow this structure:

## Target Backend

- NestJS
- TypeScript
- TypeORM or compatible ORM
- MySQL in development
- HighGo database in production
- JWT + RBAC
- Admin API and Public API separated

## Required Module Boundaries

Use these modules unless explicitly told otherwise:

- AuthModule
- SystemModule
- ContentModule
- PublishModule
- ServiceGuideModule
- GuideConfigModule
- HomeConfigModule
- NavigationModule
- ShowcaseModule
- FileModule
- PublicApiModule
- AdminApiModule
- StatsModule
- CacheModule
- CommonModule

## Implementation Rules

1. Do not put all routes in one controller.
2. Do not mix admin and public APIs in the same controller unless clearly separated.
3. Use DTOs for request validation.
4. Use services for business logic.
5. Use repositories/data-access services for database operations.
6. Use guards for authentication and RBAC.
7. Use interceptors/filters for unified responses and error handling.
8. Every admin write operation should be ready for operation logging.
9. Every publishable resource should integrate with PublishModule.
10. Do not implement unsupported Phase 2 features unless explicitly requested.

## Output Requirements

When finishing a module task, report:

- Created/changed files
- New API routes
- New database entities
- Verification commands run
- Known TODOs
