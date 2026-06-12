import { describe, expect, it } from 'vitest'
import { looksLikeHtml, sanitizePublicBody } from '../src/utils/sanitizeBody'

describe('sanitizePublicBody', () => {
  it('移除 script 标签', () => {
    const raw = '<p>正文</p><script>alert(1)</script>'
    expect(sanitizePublicBody(raw)).not.toMatch(/script/i)
    expect(sanitizePublicBody(raw)).toContain('正文')
  })

  it('移除 onerror 事件属性', () => {
    const raw = '<img src=x onerror="alert(1)"><p>安全</p>'
    expect(sanitizePublicBody(raw)).not.toMatch(/onerror/i)
  })

  it('移除 javascript: 链接', () => {
    const raw = '<a href="javascript:alert(1)">点我</a>'
    expect(sanitizePublicBody(raw)).not.toMatch(/javascript:/i)
  })

  it('纯文本不含尖括号时不视为 HTML', () => {
    expect(looksLikeHtml('普通正文')).toBe(false)
  })
})
