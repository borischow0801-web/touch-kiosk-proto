import { describe, expect, it } from 'vitest'
import { buildCreateItemPayload, buildUpdateItemPayload } from '@/utils/contentForm'
import { FORBIDDEN_ITEM_WRITE_FIELDS } from '@/constants/content'

describe('contentForm payload 语义', () => {
  it('创建 payload 不包含禁止字段', () => {
    const payload = buildCreateItemPayload({
      contentType: 'policy_file',
      title: '测试标题',
      status: 'published',
      currentVersionId: 'v-1',
      publishAt: '2024-01-01',
    })
    for (const key of FORBIDDEN_ITEM_WRITE_FIELDS) {
      expect(payload).not.toHaveProperty(key)
    }
  })

  it('更新时清空 categoryId 发送空字符串', () => {
    const payload = buildUpdateItemPayload({ categoryId: '' })
    expect(payload.categoryId).toBe('')
  })

  it('更新时清空 body 发送空字符串', () => {
    const payload = buildUpdateItemPayload({ body: '' })
    expect(payload.body).toBe('')
  })

  it('更新时清空 subtitle、summary、sourceType、sourceUrl', () => {
    const payload = buildUpdateItemPayload({
      subtitle: '',
      summary: '',
      sourceType: '',
      sourceUrl: '',
    })
    expect(payload.subtitle).toBe('')
    expect(payload.summary).toBe('')
    expect(payload.sourceType).toBe('')
    expect(payload.sourceUrl).toBe('')
  })

  it('未提供字段不进入 payload', () => {
    const payload = buildUpdateItemPayload({ title: '仅标题' })
    expect(payload.title).toBe('仅标题')
    expect(payload).not.toHaveProperty('body')
    expect(payload).not.toHaveProperty('categoryId')
    expect(payload).not.toHaveProperty('subtitle')
  })

  it('禁止字段仍被过滤', () => {
    const payload = buildUpdateItemPayload({
      title: '新标题',
      status: 'published',
      currentVersionId: 'v-2',
      publishAt: '2024-06-01',
    })
    for (const key of FORBIDDEN_ITEM_WRITE_FIELDS) {
      expect(payload).not.toHaveProperty(key)
    }
    expect(payload.title).toBe('新标题')
  })
})
