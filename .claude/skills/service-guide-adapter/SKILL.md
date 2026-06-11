---
name: service-guide-adapter
description: Use this skill when implementing the办事指南 integration with the大数据共享平台.
---

# Service Guide Adapter Skill

The service guide is the core query function.

## Architecture

kiosk-app must never call the data sharing platform directly.

Correct path:

kiosk-app
→ backend public API
→ ServiceGuideModule
→ data sharing platform
→ field mapping
→ cache fallback
→ kiosk-app

## Data Strategy

Do not sync all service guide data.

Do not run scheduled full synchronization.

Use real-time query with precise parameters.

## Query Flow

Department flow:

部门
→ 事项类型
→ 事项列表
→ 事项详情

Theme flow:

主题
→ 事项类型
→ 事项列表
→ 事项详情

## Local Config

The admin system maintains only lightweight display configuration:

- visible departments
- department code mapping
- theme mapping
- hot items
- recommended items
- item aliases
- sort order
- visibility
- related policies
- related FAQ

## Cache Strategy

On successful platform API call:

- save or update guide_api_cache
- cache by api_name + normalized request params

On platform API failure:

- return the last valid cached response if available
- otherwise return a friendly service unavailable response

## Security Rules

- Do not expose platform credentials.
- Do not expose raw platform parameters to kiosk-app.
- Do not log sensitive personal data.
- Use timeout and error handling for every external call.
- Normalize platform JSON into stable public response DTOs.
