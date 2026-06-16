import { vi } from 'vitest'

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
}

function envelope<T>(data: T, code = 0, message = '成功'): ApiEnvelope<T> {
  return { code, message, data }
}

export function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response
}

export function stubFetchSuccess(data: unknown) {
  return vi.spyOn(window, 'fetch').mockImplementation(async () =>
    jsonResponse(envelope(data)),
  )
}

export function stubFetchSequence(
  handlers: Array<() => Response | Promise<Response>>,
) {
  const spy = vi.spyOn(window, 'fetch')
  handlers.forEach((handler, index) => {
    if (index === handlers.length - 1) {
      spy.mockImplementation(handler)
    } else {
      spy.mockImplementationOnce(handler)
    }
  })
  return spy
}

export function stubFetchFailure(message: string) {
  return vi.spyOn(window, 'fetch').mockImplementation(async () =>
    jsonResponse(envelope(null, 500, message)),
  )
}

export function stubFetchNetworkError(message = '网络连接失败，请检查网络后重试') {
  return vi.spyOn(window, 'fetch').mockRejectedValue(new Error(message))
}

export const MOCK_REMOTE_HOME_CONFIG = {
  title: '远程配置大厅',
  subtitle: '来自 Public Home API',
  idleSeconds: 90,
  bannerLines: ['远程横幅提示'],
  theme: { primaryColor: '#0052d9' },
  modules: [
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
      moduleCode: 'guide_dept',
      moduleName: '按部门查',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: 'l',
      targetType: 'route',
      targetValue: '/depts',
    },
  ],
  homeHotItems: [
    { itemId: 'remote-001', name: '远程高频事项' },
  ],
  noticeSummaries: [
    { id: 'n-1', title: '远程通知', summary: '摘要', publishAt: '2024-06-01' },
  ],
  nav: [
    { label: '首页', to: '/home' },
    { label: '返回', to: 'BACK' },
    { label: '重来', to: '/home?reset=1' },
    { label: '帮助', to: '/help' },
  ],
}

export function homeConfigEnvelope(
  data: unknown,
  code = 0,
  message = '成功',
): ApiEnvelope<unknown> {
  return { code, message, data }
}

export function homeConfigResponse(
  data: unknown,
  options: { ok?: boolean; status?: number; code?: number; message?: string } = {},
): Response {
  const { ok = true, status = ok ? 200 : 503, code = ok ? 0 : 503, message = ok ? '成功' : '服务暂不可用' } = options
  return {
    ok,
    status,
    json: async () => homeConfigEnvelope(data, code, message),
  } as Response
}

export function stubFetchHomeConfig(data: unknown = MOCK_REMOTE_HOME_CONFIG) {
  return vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/api/public/home/config')) {
      return homeConfigResponse(data)
    }
    if (url.includes('/api/public/stats/')) {
      return jsonResponse(envelope({ ok: true }))
    }
    return jsonResponse(envelope({}))
  })
}

export function stubFetchHome503() {
  return vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/api/public/home/config')) {
      return homeConfigResponse(null, { ok: false, status: 503, code: 503, message: '服务暂不可用' })
    }
    if (url.includes('/api/public/stats/')) {
      return jsonResponse(envelope({ ok: true }))
    }
    return jsonResponse(envelope({}))
  })
}

export function countHomeConfigRequests(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((call) => String(call[0]).includes('/api/public/home/config')).length
}

export function lastFetchUrl(spy: ReturnType<typeof vi.spyOn>): string {
  const calls = spy.mock.calls
  const last = calls[calls.length - 1]
  return String(last?.[0] ?? '')
}

export function listItem(
  partial: Partial<import('../../src/api/types').PublicContentListItem> &
    Pick<import('../../src/api/types').PublicContentListItem, 'id' | 'title'>,
): import('../../src/api/types').PublicContentListItem {
  return {
    contentType: 'policy_file',
    subtitle: null,
    summary: null,
    categoryId: null,
    coverFileId: null,
    publishAt: '2024-06-01',
    sourceType: null,
    sourceUrl: null,
    ...partial,
  }
}

export function listPage(
  items: import('../../src/api/types').PublicContentListItem[],
  page = 1,
  pageSize = 10,
) {
  return { list: items, total: items.length, page, pageSize }
}

/** __DEVELOPMENT_MOCK_EXAMPLE_DATA__ shaped fixtures for service-guide lifecycle tests */
export const MOCK_GUIDE_DEPTS = [
  { deptCode: 'D-001', name: '人社局', firstLetter: '人' },
]

export const MOCK_GUIDE_THEMES = [
  { themeCode: 'T-001', name: '社会保障' },
]

export const MOCK_GUIDE_ITEM_TYPES = [
  { code: 'query', name: '查询咨询' },
  { code: 'apply', name: '申请办理' },
]

export const MOCK_GUIDE_ITEMS_PAGE1 = {
  list: [
    { itemId: 'i-001', name: '社保查询（示例）', deptCode: 'D-001', themeCode: 'T-001', itemTypeCode: 'query' },
    { itemId: 'i-005', name: '公积金提取（示例）', deptCode: 'D-001', themeCode: 'T-001', itemTypeCode: 'apply' },
  ],
  total: 25,
  page: 1,
  pageSize: 10,
}

export const MOCK_GUIDE_ITEMS_PAGE2 = {
  list: [
    { itemId: 'i-002', name: '医保报销（示例）', deptCode: 'D-002', themeCode: 'T-002', itemTypeCode: 'apply' },
    { itemId: 'i-003', name: '不动产登记（示例）', deptCode: 'D-003', themeCode: 'T-003', itemTypeCode: 'apply' },
  ],
  total: 25,
  page: 2,
  pageSize: 10,
}

export const MOCK_GUIDE_ITEMS_PAGE3 = {
  list: [
    { itemId: 'i-006', name: '户籍业务（示例）', deptCode: 'D-004', themeCode: 'T-001', itemTypeCode: 'apply' },
  ],
  total: 25,
  page: 3,
  pageSize: 10,
}

export const MOCK_GUIDE_ITEM_DETAIL: import('../../src/api/types').ItemDetail = {
  basicInfo: {
    itemId: 'i-001',
    name: '社保查询（示例）',
    deptName: '人社局',
    themeNames: ['社会保障'],
    summary: '',
  },
  acceptConditions: ['年满16周岁'],
  materials: [{ name: '身份证原件', required: true }],
  processSteps: [{ step: 1, name: '取号排队' }],
  locations: [{ name: '人社业务窗口', floor: '一楼', area: 'A区' }],
  workTime: '工作日 09:00-17:00',
  timeLimit: '即时办结',
  fee: '免费',
  legalBasis: [],
  consultationPhone: '12333',
  complaintPhone: '',
  relatedPolicies: [],
  relatedFaqs: [],
}

export interface ServiceGuideFetchOptions {
  depts?: unknown
  themes?: unknown
  deptItemTypes?: unknown
  themeItemTypes?: unknown
  items?: (url: string) => unknown
  itemDetail?: (url: string) => Response | Promise<Response>
}

export function stubServiceGuideFetch(options: ServiceGuideFetchOptions = {}) {
  return vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/api/admin/')) {
      return jsonResponse(envelope(null, 401, '未登录'))
    }
    if (url.includes('/service-guide/depts/') && url.includes('/item-types')) {
      return jsonResponse(envelope(options.deptItemTypes ?? MOCK_GUIDE_ITEM_TYPES))
    }
    if (url.includes('/service-guide/themes/') && url.includes('/item-types')) {
      return jsonResponse(envelope(options.themeItemTypes ?? MOCK_GUIDE_ITEM_TYPES))
    }
    if (url.includes('/service-guide/depts')) {
      return jsonResponse(envelope(options.depts ?? MOCK_GUIDE_DEPTS))
    }
    if (url.includes('/service-guide/themes')) {
      return jsonResponse(envelope(options.themes ?? MOCK_GUIDE_THEMES))
    }
    if (url.includes('/service-guide/items/')) {
      if (options.itemDetail) return options.itemDetail(url)
      return jsonResponse(envelope(MOCK_GUIDE_ITEM_DETAIL))
    }
    if (url.includes('/service-guide/items')) {
      if (options.items) {
        const result = options.items(url)
        if (result && typeof result === 'object' && 'ok' in (result as Response)) {
          return result as Response
        }
        return jsonResponse(envelope(result))
      }
      return jsonResponse(envelope(MOCK_GUIDE_ITEMS_PAGE1))
    }
    if (url.includes('/api/public/stats/')) {
      return jsonResponse(envelope({ ok: true }))
    }
    return jsonResponse(envelope({}))
  })
}
