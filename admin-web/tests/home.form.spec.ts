import { describe, expect, it } from 'vitest'
import {
  buildSortItems,
  configHasPendingReview,
  parseJsonField,
} from '@/utils/homeForm'
import { listHomePublishActions } from '@/utils/homePublishActions'
import type { AdminHomeConfig } from '@/api/home/types'

describe('首页配置表单工具', () => {
  it('parseJsonField 合法 JSON 返回对象', () => {
    const result = parseJsonField('{"a":1}', '主题 JSON')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ a: 1 })
  })

  it('parseJsonField 非法 JSON 返回错误', () => {
    const result = parseJsonField('{bad', '顶部横幅 JSON')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('顶部横幅 JSON')
  })

  it('buildSortItems 检测重复 sortOrder', () => {
    const result = buildSortItems([
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 1 },
    ])
    expect(result.ok).toBe(false)
  })

  it('configHasPendingReview 主表 pending 时为 true', () => {
    const config: AdminHomeConfig = {
      id: 'c1',
      configName: 'default',
      status: 'pending',
      currentVersionId: null,
      currentVersion: null,
      draftVersion: null,
      updatedAt: null,
    }
    expect(configHasPendingReview(config, [])).toBe(true)
  })

  it('listHomePublishActions draft 显示提交与直接发布', () => {
    const config: AdminHomeConfig = {
      id: 'c1',
      configName: 'default',
      status: 'draft',
      currentVersionId: null,
      currentVersion: null,
      draftVersion: {
        id: 'd1',
        versionNo: 1,
        title: 't',
        subtitle: null,
        status: 'draft',
        topBannerJson: [],
        themeJson: {},
        changeRemark: null,
      },
      updatedAt: null,
    }
    const actions = listHomePublishActions(config, [])
    expect(actions).toContain('submit')
    expect(actions).toContain('directPublish')
  })
})
