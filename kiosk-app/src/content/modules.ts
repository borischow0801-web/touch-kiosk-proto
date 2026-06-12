/** 群众端政务公开模块：路由 key ↔ API 路径段（与 backend PUBLIC_CONTENT_ROUTES 一致） */
export interface ContentModuleConfig {
  routeKey: string
  apiSegment: string
  title: string
  homeLabel: string
  supportsDetail: boolean
  showOnHome: boolean
}

export const CONTENT_MODULES: readonly ContentModuleConfig[] = [
  {
    routeKey: 'policies',
    apiSegment: 'policies',
    title: '政策文件',
    homeLabel: '政策文件',
    supportsDetail: true,
    showOnHome: true,
  },
  {
    routeKey: 'interpretations',
    apiSegment: 'interpretations',
    title: '政策解读',
    homeLabel: '政策解读',
    supportsDetail: true,
    showOnHome: true,
  },
  {
    routeKey: 'open-guide',
    apiSegment: 'open-guide',
    title: '信息公开指南',
    homeLabel: '信息公开指南',
    supportsDetail: false,
    showOnHome: true,
  },
  {
    routeKey: 'open-system',
    apiSegment: 'open-system',
    title: '信息公开制度',
    homeLabel: '信息公开制度',
    supportsDetail: false,
    showOnHome: true,
  },
  {
    routeKey: 'open-catalog',
    apiSegment: 'open-catalog',
    title: '主动公开目录',
    homeLabel: '主动公开目录',
    supportsDetail: false,
    showOnHome: true,
  },
  {
    routeKey: 'annual-reports',
    apiSegment: 'annual-reports',
    title: '年度报告',
    homeLabel: '年度报告',
    supportsDetail: false,
    showOnHome: true,
  },
  {
    routeKey: 'organizations',
    apiSegment: 'organizations',
    title: '机构职能',
    homeLabel: '机构职能',
    supportsDetail: true,
    showOnHome: true,
  },
  {
    routeKey: 'faqs',
    apiSegment: 'faqs',
    title: '常见问题',
    homeLabel: '常见问题',
    supportsDetail: true,
    showOnHome: true,
  },
  {
    routeKey: 'notices',
    apiSegment: 'notices',
    title: '通知公告',
    homeLabel: '通知公告',
    supportsDetail: true,
    showOnHome: true,
  },
] as const

const MODULE_BY_ROUTE = new Map(CONTENT_MODULES.map((m) => [m.routeKey, m]))

export function getContentModule(routeKey: string): ContentModuleConfig | undefined {
  return MODULE_BY_ROUTE.get(routeKey)
}

export function getContentModuleOrThrow(routeKey: string): ContentModuleConfig {
  const mod = getContentModule(routeKey)
  if (!mod) throw new Error(`未知内容模块: ${routeKey}`)
  return mod
}

export const HOME_CONTENT_MODULES = CONTENT_MODULES.filter((m) => m.showOnHome)
