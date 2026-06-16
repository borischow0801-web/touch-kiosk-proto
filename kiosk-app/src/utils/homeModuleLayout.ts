import type { PublicHomeModule } from '../api/types'

export type ModuleLayoutType = 'xl' | 'l' | 'm' | 's' | 'banner' | 'full'

const LAYOUT_TYPES = new Set<ModuleLayoutType>(['xl', 'l', 'm', 's', 'banner', 'full'])

export interface ModuleDisplayLayout {
  layout: ModuleLayoutType
  gridColumnSpan: number
}

export function isHonorModule(mod: PublicHomeModule): boolean {
  const code = mod.moduleCode.toLowerCase()
  if (code.includes('pioneer') || code.includes('showcase')) return true
  return mod.moduleName.includes('模范') || mod.moduleName.includes('先锋')
}

export function resolveLayoutType(mod: PublicHomeModule): ModuleLayoutType {
  const raw = mod.layoutType?.trim().toLowerCase()
  if (raw && LAYOUT_TYPES.has(raw as ModuleLayoutType)) {
    return raw as ModuleLayoutType
  }
  if (isHonorModule(mod) || mod.moduleType === 'banner') return 'banner'
  if (mod.moduleCode === 'content_policies') return 'l'
  if (mod.moduleCode === 'guide_dept') return 'l'
  if (mod.moduleCode === 'guide_topic') return 'm'
  if (mod.moduleCode === 'content_faqs') return 'm'
  if (mod.moduleCode === 'content_notices') return 's'
  if (mod.moduleCode === 'navigation') return 'm'
  return 'm'
}

export function layoutSpanForType(layout: ModuleLayoutType): number {
  switch (layout) {
    case 'xl':
    case 'full':
    case 'banner':
      return 12
    case 'l':
    case 'm':
      return 6
    case 's':
      return 4
    default:
      return 6
  }
}

export function layoutGridClass(layout: ModuleLayoutType): string {
  return `home-layout-${layout}`
}

export function moduleCardHeightPx(layout: ModuleLayoutType): number {
  switch (layout) {
    case 'xl':
    case 'full':
      return 200
    case 'l':
      return 180
    case 'banner':
      return 104
    case 's':
      return 132
    case 'm':
    default:
      return 148
  }
}

export function moduleSubtitle(mod: PublicHomeModule): string {
  if (isHonorModule(mod)) return '点击查看荣誉展示'
  if (mod.targetType === 'content') return '点击查看列表'
  if (mod.targetType === 'route') return '点击进入'
  return ''
}

export function moduleAccentColor(mod: PublicHomeModule): string {
  if (mod.color) return mod.color
  if (isHonorModule(mod)) return 'var(--kiosk-color-gold)'
  if (mod.moduleCode === 'content_policies') return 'var(--kiosk-color-horizon)'
  return 'var(--kiosk-color-horizon)'
}

/**
 * 根据模块与总数计算展示布局。
 * 远程仅返回少量模块时，自动填满网格，避免大片空白；不伪造模块数据。
 */
export function resolveModuleDisplayLayout(
  mod: PublicHomeModule,
  index: number,
  total: number,
): ModuleDisplayLayout {
  if (isHonorModule(mod)) {
    return { layout: 'banner', gridColumnSpan: 12 }
  }

  const explicit = mod.layoutType?.trim()
  if (explicit) {
    const layout = resolveLayoutType(mod)
    return { layout, gridColumnSpan: layoutSpanForType(layout) }
  }

  if (total === 1) {
    return { layout: 'l', gridColumnSpan: 12 }
  }
  if (total === 2) {
    return { layout: 'l', gridColumnSpan: 6 }
  }
  if (total === 3) {
    if (index === 0) return { layout: 'l', gridColumnSpan: 7 }
    if (index === 1) return { layout: 'm', gridColumnSpan: 5 }
    return { layout: 'l', gridColumnSpan: 12 }
  }

  const layout = resolveLayoutType(mod)
  return { layout, gridColumnSpan: layoutSpanForType(layout) }
}

export function policiesBeforeDept(modules: PublicHomeModule[]): boolean {
  const policiesIdx = modules.findIndex((m) => m.moduleCode === 'content_policies')
  const deptIdx = modules.findIndex((m) => m.moduleCode === 'guide_dept')
  if (policiesIdx < 0 || deptIdx < 0) return false
  return policiesIdx < deptIdx
}
