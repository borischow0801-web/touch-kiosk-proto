import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONTENT_MODULES } from '../src/content/modules'

const routerSrc = readFileSync(resolve(__dirname, '../src/app/router.ts'), 'utf8')
const contentListSrc = readFileSync(resolve(__dirname, '../src/pages/ContentList.vue'), 'utf8')
const contentDetailSrc = readFileSync(resolve(__dirname, '../src/pages/ContentDetail.vue'), 'utf8')

describe('content routes', () => {
  it('路由注册列表与详情页', () => {
    expect(routerSrc).toContain("path: '/content/:type'")
    expect(routerSrc).toContain("path: '/content/:type/:id'")
  })

  it.each(CONTENT_MODULES.filter((m) => !m.supportsDetail))(
    '$routeKey 列表页不请求详情接口',
    (mod) => {
      expect(contentListSrc).toContain('supportsDetail')
      expect(mod.supportsDetail).toBe(false)
    },
  )

  it('详情页对不支持详情的类型显示错误页', () => {
    expect(contentDetailSrc).toContain('supportsDetail')
    expect(contentDetailSrc).toContain('invalidRoute')
    expect(contentDetailSrc).toContain('ContentRouteFallback')
  })
})
