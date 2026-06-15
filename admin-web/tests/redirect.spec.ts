import { describe, expect, it } from 'vitest'
import { safeRedirectPath } from '@/router/redirect'

describe('safeRedirectPath', () => {
  it('接受站内路径', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard')
    expect(safeRedirectPath('/content/list')).toBe('/content/list')
  })

  it('拒绝外部或登录页重定向', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard')
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard')
    expect(safeRedirectPath('/login')).toBe('/dashboard')
    expect(safeRedirectPath('/login?x=1')).toBe('/dashboard')
  })
})
