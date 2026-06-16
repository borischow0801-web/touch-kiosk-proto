import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appVue = readFileSync(resolve(__dirname, '../src/App.vue'), 'utf8')
const headerVue = readFileSync(resolve(__dirname, '../src/components/home/KioskHomeHeader.vue'), 'utf8')
const homeCss = readFileSync(resolve(__dirname, '../src/styles/home.css'), 'utf8')

describe('1080×1920 竖屏布局', () => {
  it('顶部约 29vh 展示区', () => {
    expect(appVue).toContain('KioskHomeHeader')
    expect(headerVue).toContain('29vh')
  })

  it('中部约 68vh 操作区', () => {
    expect(appVue).toContain('kiosk-main')
    expect(homeCss).toContain('68vh')
  })

  it('底部固定导航', () => {
    expect(appVue).toContain('KioskBottomNav')
  })
})
