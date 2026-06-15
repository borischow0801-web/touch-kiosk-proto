import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  containsDangerousMarkup,
  isDomParserAvailable,
  sanitizePublicBody,
} from '../src/utils/sanitizeBody'

describe('sanitizePublicBody — 安全规则', () => {
  it('不允许外层标签包裹 span onclick', () => {
    const out = sanitizePublicBody('<div><span onclick="alert(1)">恶意</span></div>')
    expect(out).toContain('恶意')
    expect(containsDangerousMarkup(out)).toBe(false)
  })

  it('多层嵌套事件属性全部移除', () => {
    const out = sanitizePublicBody('<p><span onmouseover="x()"><b ONCLICK=alert(1)>嵌套</b></span></p>')
    expect(out).toContain('嵌套')
    expect(containsDangerousMarkup(out)).toBe(false)
  })

  it('移除 style="position:fixed"', () => {
    const out = sanitizePublicBody('<p style="position:fixed;top:0">浮动</p>')
    expect(out).toContain('浮动')
    expect(out).not.toMatch(/style\s*=/i)
    expect(out).not.toMatch(/position\s*:/i)
  })

  it('移除 style 中外部 URL', () => {
    const out = sanitizePublicBody('<span style="background:url(http://evil.com/x.gif)">图</span>')
    expect(containsDangerousMarkup(out)).toBe(false)
  })

  it('删除 SVG 与 MathML 节点', () => {
    const out = sanitizePublicBody('<svg onload="x()"></svg><math><mi>x</mi></math><p>正文</p>')
    expect(out).toContain('正文')
    expect(out).not.toMatch(/<svg/i)
    expect(out).not.toMatch(/<math/i)
  })

  it('大小写混合事件属性', () => {
    const out = sanitizePublicBody('<p OnClick="bad()">内容</p>')
    expect(containsDangerousMarkup(out)).toBe(false)
  })

  it('无引号事件属性', () => {
    const out = sanitizePublicBody('<p onclick=alert(1)>内容</p>')
    expect(containsDangerousMarkup(out)).toBe(false)
  })

  it('移除 javascript: 与 data: URL', () => {
    const out = sanitizePublicBody('<a href="javascript:alert(1)">链</a><img src="data:text/html,evil">')
    expect(containsDangerousMarkup(out)).toBe(false)
  })

  it('script 节点及其内容整体删除', () => {
    const out = sanitizePublicBody('<p>前</p><script>void(0)</script><p>后</p>')
    expect(out).toContain('前')
    expect(out).toContain('后')
    expect(out).not.toMatch(/<script/i)
  })

  it('允许标签不保留 class/id/src/href', () => {
    const out = sanitizePublicBody('<p class="x" id="y">段落</p>')
    expect(out).toBe('<p>段落</p>')
  })

  it('危险标签解包后子节点仍递归清理', () => {
    const out = sanitizePublicBody('<div><span onclick="1">保留</span><script>void(0)</script></div>')
    expect(out).toContain('保留')
    expect(containsDangerousMarkup(out)).toBe(false)
  })
})

describe('sanitizePublicBody — DOMParser 降级', () => {
  const original = globalThis.DOMParser

  beforeEach(() => {
    // @ts-expect-error test shim
    delete globalThis.DOMParser
  })

  afterEach(() => {
    globalThis.DOMParser = original
  })

  it('DOMParser 不存在时输出为转义纯文本', () => {
    expect(isDomParserAvailable()).toBe(false)
    const out = sanitizePublicBody('<p onclick="x">正文</p>')
    expect(out).not.toMatch(/<p/i)
    expect(out).toContain('正文')
    expect(containsDangerousMarkup(out)).toBe(false)
  })
})
