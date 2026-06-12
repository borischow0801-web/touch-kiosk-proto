import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HOME_CONTENT_MODULES } from '../src/content/modules'

const homeSrc = readFileSync(resolve(__dirname, '../src/pages/Home.vue'), 'utf8')

describe('首页政务公开入口', () => {
  it('首页引用全部政务公开模块', () => {
    expect(homeSrc).toContain('HOME_CONTENT_MODULES')
    expect(homeSrc).toContain('/content/')
    expect(HOME_CONTENT_MODULES.length).toBe(9)
  })

  it.each(HOME_CONTENT_MODULES)('$homeLabel 进入 /content/$routeKey', (mod) => {
    expect(homeSrc).toContain('openContent')
    expect(mod.routeKey).toBeTruthy()
  })
})
