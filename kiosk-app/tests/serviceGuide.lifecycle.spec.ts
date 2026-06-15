import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import DeptList from '../src/pages/DeptList.vue'
import TopicList from '../src/pages/TopicList.vue'
import ItemTypeList from '../src/pages/ItemTypeList.vue'
import ItemList from '../src/pages/ItemList.vue'
import ItemDetail from '../src/pages/ItemDetail.vue'
import { useGuideStore } from '../src/stores/guide'
import {
  lastFetchUrl,
  MOCK_GUIDE_ITEM_DETAIL,
  MOCK_GUIDE_ITEMS_PAGE1,
  MOCK_GUIDE_ITEMS_PAGE2,
  MOCK_GUIDE_ITEMS_PAGE3,
  stubFetchNetworkError,
  stubServiceGuideFetch,
} from './helpers/publicApiMock'

function guideRoutes() {
  return [
    { path: '/depts', component: DeptList },
    { path: '/topics', component: TopicList },
    { path: '/item-types', component: ItemTypeList },
    { path: '/items', component: ItemList },
    { path: '/items/:itemId', component: ItemDetail },
    { path: '/home', component: { template: '<div>home</div>' } },
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

describe('办事指南按部门完整链路', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('部门 → 事项类型 → 列表 → 详情', async () => {
    const fetchSpy = stubServiceGuideFetch({
      items: (url) => (url.includes('page=1') ? MOCK_GUIDE_ITEMS_PAGE1 : MOCK_GUIDE_ITEMS_PAGE1),
    })
    const { wrapper, router } = await mountAt('/depts')
    await waitLoaded(wrapper)
    expect(lastFetchUrl(fetchSpy)).toContain('/api/public/service-guide/depts')
    expect(wrapper.text()).toContain('人社局')

    await wrapper.find('button').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/item-types'))
    await waitLoaded(wrapper)
    expect(lastFetchUrl(fetchSpy)).toContain('/api/public/service-guide/depts/D-001/item-types')

    const typeButtons = wrapper.findAll('button').filter((b) => b.text().includes('查询咨询'))
    await typeButtons[0].trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/items'))
    await waitLoaded(wrapper)
    expect(lastFetchUrl(fetchSpy)).toContain('/api/public/service-guide/items')
    expect(wrapper.text()).toContain('社保查询（示例）')

    const itemButtons = wrapper.findAll('button').filter((b) => b.text().includes('社保查询'))
    await itemButtons[0].trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/items/i-001'))
    await waitLoaded(wrapper)
    const detailCalled = fetchSpy.mock.calls.some((c) =>
      String(c[0]).includes('/api/public/service-guide/items/i-001'),
    )
    expect(detailCalled).toBe(true)
    expect(wrapper.text()).toContain('受理条件')
    expect(wrapper.text()).not.toContain('platformParamJson')
  })
})

describe('办事指南按主题完整链路', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('主题 → 事项类型 → 列表', async () => {
    stubServiceGuideFetch()
    const { wrapper, router } = await mountAt('/topics')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('社会保障')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/item-types'))
    await waitLoaded(wrapper)

    const typeBtn = wrapper.findAll('button').find((b) => b.text().includes('查询咨询'))
    await typeBtn!.trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/items'))
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('社保查询（示例）')
  })
})

describe('办事指南空状态', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('空部门列表提示', async () => {
    stubServiceGuideFetch({ depts: [] })
    const { wrapper } = await mountAt('/depts')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('暂无部门配置')
  })

  it('空主题列表提示', async () => {
    stubServiceGuideFetch({ themes: [] })
    const { wrapper } = await mountAt('/topics')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('暂无主题配置')
  })
})

describe('办事指南列表分页', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('分页切换与准确 total', async () => {
    const fetchSpy = stubServiceGuideFetch({
      items: (url) => {
        if (url.includes('page=2')) return MOCK_GUIDE_ITEMS_PAGE2
        if (url.includes('page=3')) return MOCK_GUIDE_ITEMS_PAGE3
        return MOCK_GUIDE_ITEMS_PAGE1
      },
    })
    const { wrapper } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('1 / 3')
    expect(wrapper.text()).toContain('社保查询（示例）')

    const nextBtn = () => wrapper.findAll('button').find((b) => b.text() === '下一页')
    await nextBtn()!.trigger('click')
    await waitLoaded(wrapper, '2 / 3')
    const page2Called = fetchSpy.mock.calls.some((c) => String(c[0]).includes('page=2'))
    expect(page2Called).toBe(true)
    expect(wrapper.text()).toContain('医保报销（示例）')

    await nextBtn()!.trigger('click')
    await waitLoaded(wrapper, '3 / 3')
    expect(wrapper.text()).toContain('户籍业务（示例）')

    const beyondBtn = wrapper.findAll('button').find((b) => b.text() === '下一页')
    expect(beyondBtn).toBeUndefined()
  })
})

describe('办事指南详情字段与兜底', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('展示 13 个顶层字段区块', async () => {
    stubServiceGuideFetch()
    const { wrapper } = await mountAt('/items/i-001')
    await waitLoaded(wrapper)
    const text = wrapper.text()
    expect(text).toContain('主管部门')
    expect(text).toContain('所属主题')
    expect(text).toContain('事项摘要')
    expect(text).toContain('受理条件')
    expect(text).toContain('材料清单')
    expect(text).toContain('办理流程')
    expect(text).toContain('办理地点')
    expect(text).toContain('办理时间')
    expect(text).toContain('承诺时限')
    expect(text).toContain('收费标准')
    expect(text).toContain('法律依据')
    expect(text).toContain('咨询电话')
    expect(text).toContain('投诉电话')
    expect(text).toContain('关联政策')
    expect(text).toContain('常见问题')
  })

  it('空字段显示暂无相关信息', async () => {
    stubServiceGuideFetch({
      itemDetail: async () => ({
        ok: true,
        json: async () => ({
          code: 0,
          message: '成功',
          data: {
            ...MOCK_GUIDE_ITEM_DETAIL,
            complaintPhone: '',
            legalBasis: [],
            relatedPolicies: [],
            relatedFaqs: [],
            basicInfo: { ...MOCK_GUIDE_ITEM_DETAIL.basicInfo, summary: '' },
          },
        }),
      }) as Response,
    })
    const { wrapper } = await mountAt('/items/i-001')
    await waitLoaded(wrapper)
    const emptyCount = (wrapper.text().match(/暂无相关信息/g) ?? []).length
    expect(emptyCount).toBeGreaterThanOrEqual(4)
  })
})

describe('办事指南错误处理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('404 显示事项不存在', async () => {
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
  })

  it('503 友好提示', async () => {
    stubServiceGuideFetch({
      items: () => ({
        ok: false,
        status: 503,
        json: async () => ({ code: 503, message: '办事指南服务暂不可用', data: null }),
      }) as Response,
    })
    const { wrapper } = await mountAt('/items?deptCode=D-001&itemTypeCode=query')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('办事指南服务暂不可用')
  })

  it('网络失败友好提示', async () => {
    stubFetchNetworkError()
    const { wrapper } = await mountAt('/depts')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('网络连接失败')
  })
})

describe('办事指南防重复与路由安全', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('快速重复点击部门卡片只触发一次导航', async () => {
    stubServiceGuideFetch()
    const { wrapper, router } = await mountAt('/depts')
    await waitLoaded(wrapper)
    const card = wrapper.find('button')
    await card.trigger('click')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/item-types')
  })

  it('非法 item-types 参数显示回退', async () => {
    const { wrapper } = await mountAt('/item-types')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')
  })

  it('非法 items 查询显示回退', async () => {
    const { wrapper } = await mountAt('/items')
    await flushPromises()
    expect(wrapper.text()).toContain('参数无效')
  })

  it('不请求 admin 或外部平台地址', async () => {
    const fetchSpy = stubServiceGuideFetch()
    await mountAt('/depts')
    await flushPromises()
    for (const call of fetchSpy.mock.calls) {
      const url = String(call[0])
      expect(url).not.toMatch(/\/api\/admin\//)
      expect(url).not.toMatch(/^https?:\/\//)
    }
  })
})

describe('办事指南状态清理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('重来后 guideStore 清空', async () => {
    stubServiceGuideFetch()
    const pinia = createPinia()
    setActivePinia(pinia)
    const guide = useGuideStore(pinia)
    guide.deptCode = 'D-001'
    guide.deptName = '人社局'
    guide.rememberListPage('dept:D-001:query', 3)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: guideRoutes(),
    })
    await router.push('/depts')
    await router.isReady()
    guide.$reset()
    expect(guide.deptCode).toBe('')
    expect(guide.deptName).toBe('')
    expect(guide.listPage).toBe(1)
    expect(guide.listScopeKey).toBe('')
  })
})
