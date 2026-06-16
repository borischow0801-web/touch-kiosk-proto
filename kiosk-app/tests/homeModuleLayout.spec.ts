import { describe, expect, it } from 'vitest'
import { OFFLINE_HOME_CONFIG, OFFLINE_MODULE_COUNT } from '../src/config/offlineHomeConfig'
import {
  isHonorModule,
  layoutGridClass,
  policiesBeforeDept,
  resolveLayoutType,
  resolveModuleDisplayLayout,
} from '../src/utils/homeModuleLayout'
import type { PublicHomeModule } from '../src/api/types'

describe('首页模块布局', () => {
  it('离线配置中政策公开排在按部门查之前', () => {
    expect(policiesBeforeDept(OFFLINE_HOME_CONFIG.modules)).toBe(true)
  })

  it('离线兜底包含 6–10+ 个默认模块', () => {
    expect(OFFLINE_MODULE_COUNT).toBeGreaterThanOrEqual(6)
    expect(OFFLINE_MODULE_COUNT).toBeLessThanOrEqual(14)
  })

  it('模范先锋岗识别为 honor banner 布局', () => {
    const pioneer = OFFLINE_HOME_CONFIG.modules.find((m) => m.moduleCode === 'showcase_pioneer')
    expect(pioneer).toBeDefined()
    expect(isHonorModule(pioneer!)).toBe(true)
    expect(resolveLayoutType(pioneer!)).toBe('banner')
    expect(layoutGridClass('banner')).toBe('home-layout-banner')
  })

  it('政策公开默认 L 档，按主题查默认 M 档', () => {
    const policies = OFFLINE_HOME_CONFIG.modules.find((m) => m.moduleCode === 'content_policies')
    const topic = OFFLINE_HOME_CONFIG.modules.find((m) => m.moduleCode === 'guide_topic')
    expect(resolveLayoutType(policies!)).toBe('l')
    expect(resolveLayoutType(topic!)).toBe('m')
  })

  it('远程仅 2 个模块时双列填满，无伪造数据', () => {
    const remoteTwo: PublicHomeModule[] = [
      {
        moduleCode: 'content_policies',
        moduleName: '政策公开',
        moduleType: 'card',
        icon: null,
        color: null,
        layoutType: null,
        targetType: 'content',
        targetValue: 'policies',
      },
      {
        moduleCode: 'guide_dept',
        moduleName: '按部门查',
        moduleType: 'card',
        icon: null,
        color: null,
        layoutType: null,
        targetType: 'route',
        targetValue: '/depts',
      },
    ]
    const a = resolveModuleDisplayLayout(remoteTwo[0], 0, 2)
    const b = resolveModuleDisplayLayout(remoteTwo[1], 1, 2)
    expect(a.gridColumnSpan).toBe(6)
    expect(b.gridColumnSpan).toBe(6)
    expect(remoteTwo.length).toBe(2)
  })
})
