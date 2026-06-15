import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import ItemTypeList from '../src/pages/ItemTypeList.vue'
import ItemList from '../src/pages/ItemList.vue'
import ItemDetail from '../src/pages/ItemDetail.vue'
import KioskBottomNav from '../src/components/KioskBottomNav.vue'
import { useGuideStore } from '../src/stores/guide'
import {
  jsonResponse,
  MOCK_GUIDE_ITEMS_PAGE1,
  MOCK_GUIDE_ITEMS_PAGE2,
  MOCK_GUIDE_ITEMS_PAGE3,
  stubServiceGuideFetch,
} from './helpers/publicApiMock'

const navItems = [
  { label: '首页', to: '/home' },
  { label: '返回', to: 'BACK' },
  { label: '重来', to: '/home?reset=1' },
  { label: '帮助', to: '/help' },
]

function guideRoutes() {
  return [
    { path: '/home', component: { template: '<div>home</div>' } },
    { path: '/item-types', component: ItemTypeList },
    { path: '/items', component: ItemList },
    { path: '/items/:itemId', component: ItemDetail },
  ]
}

const GuideAppShell = defineComponent({
  render: () => h(RouterView),
})

async function mountAt(path: string, pinia = createPinia()) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: guideRoutes(),
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(GuideAppShell, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { wrapper, router, pinia }
}

async function waitLoaded(
  wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'],
  expectText?: string,
) {
  await vi.waitFor(() => {
    expect(wrapper.text()).not.toContain('加载中...')
    if (expectText) expect(wrapper.text()).toContain(expectText)
  })
}

function countItemsListFetch(spy: ReturnType<typeof vi.spyOn>): number {
  return spy.mock.calls.filter((c) => String(c[0]).includes('/api/public/service-guide/items?')).length
}

describe('办事指南列表页码保留', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('第 2 页进入详情后返回仍为第 2 页', async () => {
    stubServiceGuideFetch({
      items: (url) => (url.includes('page=2') ? MOCK_GUIDE_ITEMS_PAGE2 : MOCK_GUIDE_ITEMS_PAGE1),
    })
    const { wrapper, router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query&page=2')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('2 / 3')
    expect(wrapper.text()).toContain('医保报销（示例）')

    const itemBtn = wrapper.findAll('button').find((b) => b.text().includes('医保报销'))
    await itemBtn!.trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/items/i-002'))
    await waitLoaded(wrapper)

    await router.back()
    await flushPromises()
    await waitLoaded(wrapper)
    expect(router.currentRoute.value.fullPath).toContain('page=2')
    expect(wrapper.text()).toContain('2 / 3')
    expect(wrapper.text()).toContain('医保报销（示例）')
  })

  it('第 3 页进入详情后返回仍为第 3 页', async () => {
    stubServiceGuideFetch({
      items: (url) => {
        if (url.includes('page=3')) return MOCK_GUIDE_ITEMS_PAGE3
        if (url.includes('page=2')) return MOCK_GUIDE_ITEMS_PAGE2
        return MOCK_GUIDE_ITEMS_PAGE1
      },
    })
    const { wrapper, router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await waitLoaded(wrapper)

    const nextBtn = () => wrapper.findAll('button').find((b) => b.text() === '下一页')
    await nextBtn()!.trigger('click')
    await waitLoaded(wrapper, '2 / 3')
    await nextBtn()!.trigger('click')
    await waitLoaded(wrapper, '3 / 3')

    const itemBtn = wrapper.findAll('button').find((b) => b.text().includes('户籍业务'))
    await itemBtn!.trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/items/i-006'))

    await router.back()
    await flushPromises()
    await waitLoaded(wrapper)
    expect(router.currentRoute.value.query.page).toBe('3')
    expect(wrapper.text()).toContain('3 / 3')
    expect(wrapper.text()).toContain('户籍业务（示例）')
  })

  it('切换事项类型后重置为第 1 页', async () => {
    const fetchSpy = stubServiceGuideFetch({
      items: (url) => (url.includes('page=2') ? MOCK_GUIDE_ITEMS_PAGE2 : MOCK_GUIDE_ITEMS_PAGE1),
    })
    const { wrapper, router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query&page=2')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('2 / 3')

    await router.push('/items?deptCode=D-001&itemTypeCode=apply')
    await flushPromises()
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('1 / 3')
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('itemTypeCode=apply') && u.includes('page=1'))).toBe(true)
  })

  it('合法 page query 刷新后恢复对应页', async () => {
    stubServiceGuideFetch({
      items: (url) => (url.includes('page=3') ? MOCK_GUIDE_ITEMS_PAGE3 : MOCK_GUIDE_ITEMS_PAGE1),
    })
    const { wrapper } = await mountAt('/items?deptCode=D-001&itemTypeCode=query&page=3')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('3 / 3')
    expect(wrapper.text()).toContain('户籍业务（示例）')
  })

  it('非法 page query 安全回到第 1 页', async () => {
    const fetchSpy = stubServiceGuideFetch()
    const { wrapper, router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query&page=abc')
    await waitLoaded(wrapper, '1 / 3')
    expect(countItemsListFetch(fetchSpy)).toBe(1)
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })

  it('首页导航清理 listPage 状态', async () => {
    stubServiceGuideFetch()
    const pinia = createPinia()
    setActivePinia(pinia)
    const guide = useGuideStore(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/home', component: { template: '<div>home</div>' } },
        { path: '/items', component: ItemList },
      ],
    })
    await router.push('/items?deptCode=D-001&itemTypeCode=query&page=2')
    await router.isReady()
    guide.rememberListPage('dept:D-001:query', 2)

    const nav = mount(KioskBottomNav, {
      props: { items: navItems },
      global: { plugins: [pinia, router] },
    })
    await flushPromises()
    await nav.findAll('button')[0].trigger('click')
    await flushPromises()

    expect(guide.listPage).toBe(1)
    expect(guide.listScopeKey).toBe('')
  })
})

describe('办事指南请求竞态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('旧请求晚于新请求返回时只展示新路由结果', async () => {
    let resolveFirst: (value: Response) => void = () => {}
    const firstPending = new Promise<Response>((resolve) => { resolveFirst = resolve })

    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/public/service-guide/items')) {
        if (url.includes('itemTypeCode=query')) {
          return firstPending
        }
        if (url.includes('itemTypeCode=apply')) {
          return jsonResponse({
            code: 0,
            message: '成功',
            data: {
              list: [{ itemId: 'i-apply', name: '新类型事项', deptName: '人社局' }],
              total: 1,
              page: 1,
              pageSize: 10,
            },
          })
        }
      }
      return jsonResponse({ code: 0, message: '成功', data: [] })
    })

    const { wrapper, router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())

    await router.push('/items?deptCode=D-001&itemTypeCode=apply')
    await flushPromises()
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('新类型事项')
    expect(wrapper.text()).not.toContain('社保查询（示例）')

    resolveFirst(jsonResponse({
      code: 0,
      message: '成功',
      data: MOCK_GUIDE_ITEMS_PAGE1,
    }))
    await flushPromises()
    expect(wrapper.text()).toContain('新类型事项')
    expect(wrapper.text()).not.toContain('社保查询（示例）')
  })

  it('组件卸载后请求结果不写入状态', async () => {
    let resolveLate: (value: Response) => void = () => {}
    const latePending = new Promise<Response>((resolve) => { resolveLate = resolve })

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/public/service-guide/items/i-late')) {
        return latePending
      }
      return jsonResponse({ code: 0, message: '成功', data: {} })
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: guideRoutes(),
    })
    await router.push('/items/i-late')
    await router.isReady()
    const pinia = createPinia()
    const wrapper = mount(GuideAppShell, { global: { plugins: [pinia, router] } })
    await flushPromises()
    wrapper.unmount()

    resolveLate(jsonResponse({
      code: 0,
      message: '成功',
      data: {
        basicInfo: { itemId: 'i-late', name: '迟到的详情', deptName: '人社局', themeNames: [] },
        acceptConditions: [],
        materials: [],
        processSteps: [],
        locations: [],
      },
    }))
    await flushPromises()
    expect(wrapper.exists()).toBe(false)
  })
})

describe('办事指南结构化错误与路由加固', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('HTTP 404 使用结构化状态识别为不存在', async () => {
    stubServiceGuideFetch({
      itemDetail: async () => ({
        ok: false,
        status: 404,
        json: async () => ({ code: 404, message: '事项 not-exists 不存在', data: null }),
      }) as Response,
    })
    const { wrapper } = await mountAt('/items/not-exists')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('事项不存在')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('HTTP 500 文案含不存在不得误判为 404', async () => {
    stubServiceGuideFetch({
      itemDetail: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          code: 500,
          message: '内部记录不存在于缓存',
          data: null,
        }),
      }) as Response,
    })
    const { wrapper } = await mountAt('/items/i-001')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('事项详情加载失败')
    expect(wrapper.text()).not.toContain('事项不存在')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('同时传 deptCode 和 themeCode 时回退且不请求 API', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    const { wrapper } = await mountAt('/item-types?deptCode=D-001&themeCode=T-001')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('重复 query 数组参数不崩溃且不请求 API', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    const { wrapper } = await mountAt('/items?deptCode=D-001&deptCode=D-002&itemTypeCode=query')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('办事指南单一请求触发', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('初始进入列表只请求一次', async () => {
    const fetchSpy = stubServiceGuideFetch()
    await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await vi.waitFor(() => expect(countItemsListFetch(fetchSpy)).toBe(1))
  })

  it('点击下一页只新增 1 次事项列表请求', async () => {
    const fetchSpy = stubServiceGuideFetch({
      items: (url) => (url.includes('page=2') ? MOCK_GUIDE_ITEMS_PAGE2 : MOCK_GUIDE_ITEMS_PAGE1),
    })
    const { wrapper } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await waitLoaded(wrapper, '社保查询')
    expect(countItemsListFetch(fetchSpy)).toBe(1)

    const nextBtn = wrapper.findAll('button').find((b) => b.text() === '下一页')
    await nextBtn!.trigger('click')
    await waitLoaded(wrapper, '2 / 3')
    expect(countItemsListFetch(fetchSpy)).toBe(2)
  })

  it('scope 切换只新增 1 次请求', async () => {
    const fetchSpy = stubServiceGuideFetch()
    const { router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await vi.waitFor(() => expect(countItemsListFetch(fetchSpy)).toBe(1))

    await router.push('/items?deptCode=D-001&itemTypeCode=apply')
    await flushPromises()
    await vi.waitFor(() => expect(countItemsListFetch(fetchSpy)).toBe(2))
  })

  it('非法 page 修正后只请求第 1 页一次', async () => {
    const fetchSpy = stubServiceGuideFetch()
    await mountAt('/items?deptCode=D-001&itemTypeCode=query&page=2abc')
    await vi.waitFor(() => expect(countItemsListFetch(fetchSpy)).toBe(1))
    const urls = fetchSpy.mock.calls.map((c) => String(c[0]))
    expect(urls.every((u) => !u.includes('page=2abc'))).toBe(true)
    expect(urls[0]).toContain('page=1')
  })

  it('page=1.5 被拒绝并只请求一次', async () => {
    const fetchSpy = stubServiceGuideFetch()
    const { router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query&page=1.5')
    await vi.waitFor(() => expect(countItemsListFetch(fetchSpy)).toBe(1))
    expect(router.currentRoute.value.query.page).toBeUndefined()
  })
})

describe('办事指南有效转非法路由失效', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('ItemList 有效请求未完成切到非法路由时迟到结果不写入', async () => {
    let resolveLate: (value: Response) => void = () => {}
    const latePending = new Promise<Response>((resolve) => { resolveLate = resolve })

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/public/service-guide/items?')) return latePending
      return jsonResponse({ code: 0, message: '成功', data: [] })
    })

    const { wrapper, router } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await vi.waitFor(() => expect(wrapper.text()).toContain('加载中'))

    await router.push('/items')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')

    resolveLate(jsonResponse({
      code: 0,
      message: '成功',
      data: MOCK_GUIDE_ITEMS_PAGE1,
    }))
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')
    expect(wrapper.text()).not.toContain('社保查询（示例）')
  })

  it('ItemTypeList 有效请求未完成切到非法路由时迟到结果不写入', async () => {
    let resolveLate: (value: Response) => void = () => {}
    const latePending = new Promise<Response>((resolve) => { resolveLate = resolve })

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/item-types')) return latePending
      return jsonResponse({ code: 0, message: '成功', data: [] })
    })

    const { wrapper, router } = await mountAt('/item-types?deptCode=D-001')
    await vi.waitFor(() => expect(wrapper.text()).toContain('加载中'))

    await router.push('/item-types?deptCode=D-001&themeCode=T-001')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')

    resolveLate(jsonResponse({
      code: 0,
      message: '成功',
      data: [{ code: 'query', name: '迟到类型' }],
    }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('迟到类型')
  })

  it('ItemDetail 有效请求未完成切到非法路由时迟到结果不写入', async () => {
    let resolveLate: (value: Response) => void = () => {}
    const latePending = new Promise<Response>((resolve) => { resolveLate = resolve })

    vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/public/service-guide/items/i-late')) return latePending
      return jsonResponse({ code: 0, message: '成功', data: {} })
    })

    const { wrapper, router } = await mountAt('/items/i-late')
    await vi.waitFor(() => expect(wrapper.text()).toContain('加载中'))

    await router.push('/items/bad id')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')

    resolveLate(jsonResponse({
      code: 0,
      message: '成功',
      data: {
        basicInfo: { itemId: 'i-late', name: '迟到详情', deptName: '人社局', themeNames: [] },
        acceptConditions: [],
        materials: [],
        processSteps: [],
        locations: [],
      },
    }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('迟到详情')
  })
})
