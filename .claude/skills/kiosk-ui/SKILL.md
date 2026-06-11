---
name: kiosk-ui
description: Use this skill when implementing or reviewing kiosk-app UI for the 1080x1920 vertical Android touch screen.
---

# Kiosk UI Skill

The kiosk-app is a public Android large-screen app for a high-position vertical touch screen.

## Device

- Resolution: 1080 x 1920
- Orientation: portrait
- Runtime: Android APK generated with Capacitor
- Users: general public, including elderly users
- Main constraint: screen is installed high, so top area is hard to touch

## Non-negotiable UI Rules

1. Do not use input boxes that trigger the system keyboard.
2. Do not implement text search requiring typing.
3. Use click/tap-only navigation.
4. Use large cards and large fonts.
5. Main interaction area must be in the middle/lower part of the screen.
6. Top 30% should mainly show title, date/time, announcement, banner, or service slogan.
7. Bottom navigation should be fixed.
8. Include home, back, restart, help.
9. 90 seconds of inactivity should reset to home.
10. Returning home must clear temporary state.
11. Offline or API failure must show friendly fallback, not blank screen.

## Allowed Query Methods

- Hot keywords
- Department cards
- Theme cards
- Category filters
- Pinyin initials
- Large list cards
- Fixed menu navigation

## Suggested Home Modules

- 高频事项
- 按部门查
- 按主题查
- 政策公开
- 窗口导航
- 常见问题
- 通知公告
- 模范先锋岗

## Detail Page Rules

Service guide detail should show:

- 基本信息
- 受理条件
- 材料清单
- 办理流程
- 办理地点
- 办理时间
- 办理时限
- 收费标准
- 办理依据
- 咨询电话
- 投诉电话
- 相关政策
- 常见问题

If a field is empty, display “暂无相关信息”.
