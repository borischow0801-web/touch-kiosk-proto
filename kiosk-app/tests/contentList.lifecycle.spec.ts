import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ContentList from '../src/pages/ContentList.vue'
import ContentDetail from '../src/pages/ContentDetail.vue'
import type { PageResult, PublicContentListItem } from '../src/api/types'
import {
  lastFetchUrl,
  listItem,
  listPage,
  stubFetchSequence,
  stubFetchSuccess,
} from './helpers/publicApiMock'

function paginatedList(
  items: PublicContentListItem[],
  page: number,
  pageSize = 10,
): PageResult<PublicContentListItem> {
  return { list: items, total: 25, page, pageSize }
}

async function mountListAt(path: string, pinia = createPinia()) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/:type', component: ContentList },
      { path: '/content/:type/:id', component: ContentDetail },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ContentList, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { wrapper, router, pinia }
}

async function waitLoaded(wrapper: Awaited<ReturnType<typeof mountListAt>>['wrapper']) {
  await vi.waitFor(() => {
    expect(wrapper.text()).not.toContain('加载中...')
  })
}

describe('ContentList 生命周期', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('onMounted 自动请求正确 Public API 并渲染列表', async () => {
    const fetchSpy = stubFetchSuccess(
      paginatedList([listItem({ id: 'p1', title: '政策A' })], 1),
    )
    const { wrapper } = await mountListAt('/content/policies')
    await waitLoaded(wrapper)

    expect(lastFetchUrl(fetchSpy)).toContain('/api/public/content/policies')
    expect(lastFetchUrl(fetchSpy)).toContain('page=1')
    expect(lastFetchUrl(fetchSpy)).toContain('pageSize=10')
    expect(wrapper.text()).toContain('政策A')
  })

  it('空数据时显示暂无相关内容', async () => {
    stubFetchSuccess({ list: [], total: 0, page: 1, pageSize: 10 })
    const { wrapper } = await mountListAt('/content/policies')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('暂无相关内容')
  })

  it('请求失败显示错误并可重试成功', async () => {
    const fetchSpy = stubFetchSequence([
      async () => ({
        ok: true,
        json: async () => ({ code: 500, message: '列表服务不可用', data: null }),
      }) as Response,
      async () => ({
        ok: true,
        json: async () => ({
          code: 0,
          message: '成功',
          data: paginatedList([listItem({ id: 'p2', title: '重试成功' })], 1),
        }),
      }) as Response,
    ])
    const { wrapper } = await mountListAt('/content/policies')
    await vi.waitFor(() => expect(wrapper.text()).toContain('数据加载失败'))
    expect(wrapper.text()).toContain('列表服务不可用')

    await wrapper.get('button').trigger('click')
    await waitLoaded(wrapper)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('重试成功')
  })

  it('分页：下一页请求 page=2，上一页回到 page=1', async () => {
    const fetchSpy = stubFetchSuccess(
      paginatedList(
        Array.from({ length: 10 }, (_, i) => listItem({ id: `p${i}`, title: `条目${i}` })),
        1,
      ),
    )
    const { wrapper } = await mountListAt('/content/policies')
    await waitLoaded(wrapper)
    expect(wrapper.text()).toContain('1 / 3')

    fetchSpy.mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        code: 0,
        message: '成功',
        data: paginatedList([listItem({ id: 'p11', title: '第二页' })], 2),
      }),
    }) as Response)

    const buttons = wrapper.findAll('button[type="button"]')
    const next = buttons.find((b) => b.text().includes('下一页'))
    expect(next).toBeTruthy()
    await next!.trigger('click')
    await waitLoaded(wrapper)
    expect(lastFetchUrl(fetchSpy)).toContain('page=2')
    expect(wrapper.text()).toContain('第二页')
    expect(wrapper.text()).toContain('2 / 3')

    fetchSpy.mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        code: 0,
        message: '成功',
        data: paginatedList([listItem({ id: 'p1', title: '第一页' })], 1),
      }),
    }) as Response)

    const prev = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('上一页'))
    await prev!.trigger('click')
    await waitLoaded(wrapper)
    expect(lastFetchUrl(fetchSpy)).toContain('page=1')
    expect(wrapper.text()).toContain('第一页')
  })

  it('支持详情栏目点击后进入详情路由', async () => {
    stubFetchSuccess(paginatedList([listItem({ id: 'p9', title: '可点政策' })], 1))
    const { wrapper, router } = await mountListAt('/content/policies')
    await waitLoaded(wrapper)

    const card = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('可点政策'))
    await card!.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/content/policies/p9'))
  })

  it('仅列表栏目不产生详情导航', async () => {
    stubFetchSuccess(
      listPage([
        {
          id: 'g1',
          contentType: 'open_guide',
          title: '指南条目',
          subtitle: null,
          summary: '摘要文本',
          categoryId: null,
          coverFileId: null,
          publishAt: null,
          sourceType: null,
          sourceUrl: null,
        },
      ]),
    )
    const { wrapper, router } = await mountListAt('/content/open-guide')
    await waitLoaded(wrapper)
    expect(wrapper.find('article').exists()).toBe(true)
    expect(wrapper.findAll('button[type="button"]').filter((b) => b.text().includes('指南条目'))).toHaveLength(0)
    expect(router.currentRoute.value.path).toBe('/content/open-guide')
  })
})

describe('ContentList 非法路由', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('/content/unknown 显示友好错误且不请求接口', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    const { wrapper } = await mountListAt('/content/unknown')
    expect(wrapper.text()).toContain('页面不存在')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
