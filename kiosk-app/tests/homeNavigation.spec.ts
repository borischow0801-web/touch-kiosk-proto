import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HOME_CONTENT_MODULES } from '../src/content/modules'
import { OFFLINE_HOME_CONFIG } from '../src/config/offlineHomeConfig'

const homeSrc = readFileSync(resolve(__dirname, '../src/pages/Home.vue'), 'utf8')

describe('首页模块入口', () => {
  it('Home 页面通过配置 modules 渲染入口', () => {
    expect(homeSrc).toContain('HomeModuleGrid')
    expect(homeSrc).toContain('onModuleClick')
    expect(homeSrc).not.toContain('HOME_CONTENT_MODULES')
  })

  it('离线兜底不展示示例高频事项', () => {
    expect(OFFLINE_HOME_CONFIG.homeHotItems).toEqual([])
  })

  it('离线兜底配置包含全部政务公开模块', () => {
    const contentModules = OFFLINE_HOME_CONFIG.modules.filter((m) => m.targetType === 'content')
    expect(contentModules.length).toBe(HOME_CONTENT_MODULES.length)
    for (const mod of HOME_CONTENT_MODULES) {
      expect(contentModules.some((m) => m.targetValue === mod.routeKey)).toBe(true)
    }
  })

  it('离线兜底政策公开排在按部门查之前', () => {
    const policiesIdx = OFFLINE_HOME_CONFIG.modules.findIndex((m) => m.moduleCode === 'content_policies')
    const deptIdx = OFFLINE_HOME_CONFIG.modules.findIndex((m) => m.moduleCode === 'guide_dept')
    expect(policiesIdx).toBeGreaterThan(-1)
    expect(deptIdx).toBeGreaterThan(-1)
    expect(policiesIdx).toBeLessThan(deptIdx)
  })

  it.each(HOME_CONTENT_MODULES)('$homeLabel 可通过离线配置进入 /content/$routeKey', (mod) => {
    const entry = OFFLINE_HOME_CONFIG.modules.find((m) => m.targetValue === mod.routeKey)
    expect(entry?.targetType).toBe('content')
    expect(entry?.moduleName).toBe(mod.homeLabel)
  })
})
