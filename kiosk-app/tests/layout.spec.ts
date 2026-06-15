import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appVue = readFileSync(resolve(__dirname, '../src/App.vue'), 'utf8')

describe('1080×1920 竖屏布局', () => {
  it('顶部约 29vh 展示区', () => {
    expect(appVue).toContain('29vh')
  })

  it('中部约 68vh 操作区', () => {
    expect(appVue).toContain('68vh')
  })

  it('底部固定导航', () => {
    expect(appVue).toContain('KioskBottomNav')
  })
})
