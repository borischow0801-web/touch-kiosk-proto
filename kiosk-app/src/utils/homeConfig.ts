import { isApiError } from '../api/errors'
import type { AppConfig, HotItem, NavItem, PublicHomeModule, PublicNoticeSummary } from '../api/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeHotItem(raw: unknown): HotItem | null {
  if (!isRecord(raw)) return null
  const itemId = typeof raw.itemId === 'string'
    ? raw.itemId
    : typeof raw.id === 'string'
      ? raw.id
      : null
  const name = typeof raw.name === 'string' ? raw.name : null
  if (!itemId || !name) return null
  return { itemId, name }
}

function normalizeModule(raw: unknown): PublicHomeModule | null {
  if (!isRecord(raw)) return null
  const moduleCode = typeof raw.moduleCode === 'string' ? raw.moduleCode : null
  const moduleName = typeof raw.moduleName === 'string' ? raw.moduleName : null
  const moduleType = typeof raw.moduleType === 'string' ? raw.moduleType : null
  const targetType = typeof raw.targetType === 'string' ? raw.targetType : null
  const targetValue = typeof raw.targetValue === 'string' ? raw.targetValue : null
  if (!moduleCode || !moduleName || !moduleType || !targetType || !targetValue) return null
  return {
    moduleCode,
    moduleName,
    moduleType,
    icon: typeof raw.icon === 'string' ? raw.icon : null,
    color: typeof raw.color === 'string' ? raw.color : null,
    layoutType: typeof raw.layoutType === 'string' ? raw.layoutType : null,
    targetType,
    targetValue,
  }
}

function normalizeNotice(raw: unknown): PublicNoticeSummary | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id : null
  const title = typeof raw.title === 'string' ? raw.title : null
  if (!id || !title) return null
  return {
    id,
    title,
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    publishAt: typeof raw.publishAt === 'string' ? raw.publishAt : null,
  }
}

function normalizeNav(raw: unknown): NavItem[] {
  if (!Array.isArray(raw)) return []
  const items: NavItem[] = []
  for (const entry of raw) {
    if (!isRecord(entry)) continue
    const label = typeof entry.label === 'string' ? entry.label : null
    const to = typeof entry.to === 'string' ? entry.to : null
    if (label && to) items.push({ label, to })
  }
  return items
}

/** 将 Public Home API 响应规范化为 AppConfig；无效时返回 null */
export function normalizeAppConfig(raw: unknown): AppConfig | null {
  if (!isRecord(raw)) return null
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) return null

  const idleSeconds = typeof raw.idleSeconds === 'number' && raw.idleSeconds > 0
    ? raw.idleSeconds
    : 90

  const bannerLines = Array.isArray(raw.bannerLines)
    ? raw.bannerLines.filter((line): line is string => typeof line === 'string')
    : []

  const theme = isRecord(raw.theme) ? raw.theme : {}

  const modules = Array.isArray(raw.modules)
    ? raw.modules.map(normalizeModule).filter((m): m is PublicHomeModule => m !== null)
    : []

  const homeHotItems = Array.isArray(raw.homeHotItems)
    ? raw.homeHotItems.map(normalizeHotItem).filter((h): h is HotItem => h !== null)
    : []

  const noticeSummaries = Array.isArray(raw.noticeSummaries)
    ? raw.noticeSummaries.map(normalizeNotice).filter((n): n is PublicNoticeSummary => n !== null)
    : []

  const nav = normalizeNav(raw.nav)
  if (nav.length === 0) return null

  return {
    title,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : null,
    idleSeconds,
    bannerLines,
    theme,
    modules,
    homeHotItems,
    noticeSummaries,
    nav,
  }
}

/** 503、网络失败或数据结构异常时使用离线配置 */
export function shouldUseOfflineFallback(error: unknown): boolean {
  if (isApiError(error)) {
    return error.httpStatus === 503 || error.code === 503
  }
  return true
}
