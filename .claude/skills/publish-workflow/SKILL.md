---
name: publish-workflow
description: Use this skill when implementing content approval, publishing, withdrawal, rollback, or version management.
---

# Publish Workflow Skill

All publishable resources should use a unified workflow.

## Supported Resources

- content_item
- home_config
- guide_config
- navigation
- showcase_item
- FAQ
- notice
- policy_file
- policy_interpretation

## Statuses

Use varchar statuses:

- draft
- pending
- published
- rejected
- withdrawn
- archived

## Actions

- save_draft
- submit
- approve
- reject
- publish
- direct_publish
- withdraw
- rollback

## Rules

1. Direct publishing is allowed only for users with permission.
2. Submit-for-review flow must be supported.
3. Every publish action creates a version snapshot.
4. Published changes should not overwrite history.
5. Rollback should create a new published version based on an old snapshot.
6. Audit records must be written to publish_record.
7. Admin write operations should also be compatible with operation logging.
8. Public API should only read currently published content.
9. Draft, pending, rejected, withdrawn versions must not appear in kiosk-app.

## Required Tables

- content_item
- content_version
- publish_record

For non-content resources, use biz_type and biz_id in publish_record.
