import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import ContentDetail from '../src/pages/ContentDetail.vue'
import type { PublicContentDetail } from '../src/api/types'
import {
  lastFetchUrl,
  stubFetchSequence,
  stubFetchSuccess,
} from './helpers/publicApiMock'

function detail(
  partial: Partial<PublicContentDetail> & Pick<PublicContentDetail, 'id' | 'title'>,
): PublicContentDetail {
  return {
    contentType: 'policy_file',
    subtitle: null,
    summary: null,
    categoryId: null,
    coverFileId: null,
    publishAt: '2024-06-01',
    sourceType: null,
    sourceUrl: null,
    body: '<p>安全正文</p>',
    ...partial,
  }
}

async function mountDetailAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/content/:type/:id', component: ContentDetail }],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(ContentDetail, {
    global: { plugins: [createPinia(), router] },
  })
  await flushPromises()
  return { wrapper, router }
}

async function waitDetailLoaded(wrapper: Awaited<ReturnType<typeof mountDetailAt>>['wrapper']) {
  await vi.waitFor(() => {
    expect(wrapper.text()).not.toContain('加载中...')
  })
}

describe('ContentDetail 生命周期', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('onMounted 请求正确详情 API 并成功渲染字段与安全正文', async () => {
    const fetchSpy = stubFetchSuccess(detail({ id: 'd1', title: '详情标题', summary: '摘要内容' }))
    const { wrapper } = await mountDetailAt('/content/policies/d1')
    await waitDetailLoaded(wrapper)

    expect(lastFetchUrl(fetchSpy)).toBe('/api/public/content/policies/d1')
    expect(wrapper.text()).toContain('详情标题')
    expect(wrapper.text()).toContain('摘要内容')
    expect(wrapper.text()).toContain('安全正文')
    expect(wrapper.find('.safe-body').exists()).toBe(true)
  })

  it('空字段显示暂无相关信息', async () => {
    stubFetchSuccess(
      detail({
        id: 'd2',
        title: '无元数据',
        summary: null,
        publishAt: null,
        sourceType: null,
        sourceUrl: null,
        body: null,
      }),
    )
    const { wrapper } = await mountDetailAt('/content/policies/d2')
    await waitDetailLoaded(wrapper)
    const text = wrapper.text()
    expect(text).toContain('暂无相关信息')
    expect(text).toContain('无元数据')
  })

  it('失败提示与重试成功', async () => {
    const fetchSpy = stubFetchSequence([
      async () => ({
        ok: true,
        json: async () => ({ code: 500, message: '详情不可用', data: null }),
      }) as Response,
      async () => ({
        ok: true,
        json: async () => ({
          code: 0,
          message: '成功',
          data: detail({ id: 'd3', title: '重试详情' }),
        }),
      }) as Response,
    ])
    const { wrapper } = await mountDetailAt('/content/policies/d3')
    await vi.waitFor(() => expect(wrapper.text()).toContain('内容加载失败'))
    expect(wrapper.text()).toContain('详情不可用')

    await wrapper.get('button').trigger('click')
    await waitDetailLoaded(wrapper)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('重试详情')
  })
})

describe('ContentDetail 非法路由', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('/content/unknown/id 不请求详情接口并显示错误', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    const { wrapper } = await mountDetailAt('/content/unknown/abc')
    expect(wrapper.text()).toContain('页面不存在')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('/content/open-guide/id 不支持详情，不请求接口', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch')
    const { wrapper } = await mountDetailAt('/content/open-guide/abc')
    expect(wrapper.text()).toContain('页面不存在')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
