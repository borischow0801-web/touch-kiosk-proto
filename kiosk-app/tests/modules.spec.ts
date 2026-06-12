import { describe, expect, it } from 'vitest'
import { CONTENT_MODULES, getContentModule, HOME_CONTENT_MODULES } from '../src/content/modules'

describe('content modules mapping', () => {
  it.each(CONTENT_MODULES)('$routeKey → /api/public/content/$apiSegment', (mod) => {
    expect(mod.apiSegment).toBeTruthy()
    expect(getContentModule(mod.routeKey)?.apiSegment).toBe(mod.apiSegment)
  })

  it('政策文件支持详情', () => {
    expect(getContentModule('policies')?.supportsDetail).toBe(true)
  })

  it('信息公开类仅列表', () => {
    for (const key of ['open-guide', 'open-system', 'open-catalog', 'annual-reports']) {
      expect(getContentModule(key)?.supportsDetail).toBe(false)
    }
  })

  it('首页展示全部 9 个政务公开模块', () => {
    expect(HOME_CONTENT_MODULES).toHaveLength(9)
  })
})
