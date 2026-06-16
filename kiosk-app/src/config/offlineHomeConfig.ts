import type { AppConfig, PublicHomeModule } from '../api/types'
import { HOME_CONTENT_MODULES } from '../content/modules'

const OFFLINE_LAYOUT_BY_CODE: Record<string, string> = {
  showcase_pioneer: 'banner',
  content_policies: 'l',
  guide_topic: 'm',
  guide_dept: 'l',
  content_faqs: 'm',
  navigation: 'm',
  content_notices: 's',
  content_interpretations: 'm',
  'content_open-guide': 's',
  'content_open-system': 's',
  'content_open-catalog': 's',
  'content_annual-reports': 's',
  content_organizations: 'm',
}

function buildOfflineModules(): PublicHomeModule[] {
  const ordered: PublicHomeModule[] = [
    {
      moduleCode: 'showcase_pioneer',
      moduleName: '模范先锋岗',
      moduleType: 'banner',
      icon: null,
      color: null,
      layoutType: 'banner',
      targetType: 'route',
      targetValue: '/help',
    },
    {
      moduleCode: 'content_policies',
      moduleName: '政策公开',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 'l',
      targetType: 'content',
      targetValue: 'policies',
    },
    {
      moduleCode: 'guide_topic',
      moduleName: '按主题查',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 'm',
      targetType: 'route',
      targetValue: '/topics',
    },
    {
      moduleCode: 'guide_dept',
      moduleName: '按部门查',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 'l',
      targetType: 'route',
      targetValue: '/depts',
    },
    {
      moduleCode: 'content_faqs',
      moduleName: '常见问题',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 'm',
      targetType: 'content',
      targetValue: 'faqs',
    },
    {
      moduleCode: 'navigation',
      moduleName: '窗口导航',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 'm',
      targetType: 'route',
      targetValue: '/help',
    },
    {
      moduleCode: 'content_notices',
      moduleName: '通知公告',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 's',
      targetType: 'content',
      targetValue: 'notices',
    },
  ]

  const included = new Set(ordered.map((m) => m.moduleCode))

  for (const mod of HOME_CONTENT_MODULES) {
    const code = `content_${mod.routeKey}`
    if (included.has(code)) continue
    ordered.push({
      moduleCode: code,
      moduleName: mod.homeLabel,
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: OFFLINE_LAYOUT_BY_CODE[code] ?? 'm',
      targetType: 'content',
      targetValue: mod.routeKey,
    })
    included.add(code)
  }

  return ordered
}

/** 无已发布首页配置或网络异常时的本地离线兜底 */
export const OFFLINE_HOME_CONFIG: AppConfig = {
  title: '政务服务触摸查询',
  subtitle: '请在下方操作区点击选择',
  idleSeconds: 90,
  bannerLines: [
    '温馨提示：本页面不需要键盘输入',
    '如无操作将自动返回首页',
  ],
  theme: {},
  modules: buildOfflineModules(),
  homeHotItems: [],
  noticeSummaries: [],
  nav: [
    { label: '首页', to: '/home' },
    { label: '返回', to: 'BACK' },
    { label: '重来', to: '/home?reset=1' },
    { label: '帮助', to: '/help' },
  ],
}

export const OFFLINE_MODULE_COUNT = OFFLINE_HOME_CONFIG.modules.length
