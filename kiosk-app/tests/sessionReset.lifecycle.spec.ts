import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../src/App.vue'
import Home from '../src/pages/Home.vue'
import { useContentStore } from '../src/stores/content'
import { useGuideStore } from '../src/stores/guide'
import { jsonResponse } from './helpers/publicApiMock'

function stubAppConfigFetch() {
  return vi.spyOn(window, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/api/public/home/config')) {
      return jsonResponse({
        code: 0,
        message: '成功',
        data: {
          title: '测试大厅',
          idleSeconds: 90,
          bannerLines: [],
          theme: {},
          modules: [],
          homeHotItems: [],
          noticeSummaries: [],
          nav: [
            { label: '首页', to: '/home' },
            { label: '返回', to: 'BACK' },
            { label: '重来', to: '/home?reset=1' },
            { label: '帮助', to: '/help' },
          ],
        },
      })
    }
    return jsonResponse({ code: 0, message: '成功', data: {} })
  })
}

async function mountAppAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Home },
      { path: '/content/policies', component: { template: '<div>list</div>' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, pinia }
}

describe('重来与超时状态清理', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    stubAppConfigFetch()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('重来导航到 reset=1 后实际清理 guideStore 与 contentStore', async () => {
    const { router, pinia } = await mountAppAt('/content/policies')
    const guide = useGuideStore(pinia)
    const content = useContentStore(pinia)
    guide.deptCode = 'D1'
    content.rememberList('policies', 3)
    content.rememberDetail('policies', 'x1')

    await router.push('/home?reset=1')
    await flushPromises()

    expect(guide.deptCode).toBe('')
    expect(content.page).toBe(1)
    expect(content.detailId).toBe('')
    expect(content.listType).toBe('')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('90 秒无操作清理 guideStore、contentStore 并返回首页', async () => {
    const { router, pinia } = await mountAppAt('/content/policies')
    const guide = useGuideStore(pinia)
    const content = useContentStore(pinia)
    guide.deptCode = 'D9'
    content.rememberList('policies', 2)

    await vi.advanceTimersByTimeAsync(91_000)
    await flushPromises()
    expect(guide.deptCode).toBe('')
    expect(content.listType).toBe('')
    expect(content.page).toBe(1)
    expect(content.detailId).toBe('')
    expect(router.currentRoute.value.path).toBe('/home')
  })
})
