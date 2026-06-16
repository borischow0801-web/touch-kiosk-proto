import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../src/App.vue'
import Home from '../src/pages/Home.vue'
import { OFFLINE_HOME_CONFIG } from '../src/config/offlineHomeConfig'
import { useHomeConfigStore } from '../src/stores/homeConfig'
import { navigateHomeModule } from '../src/utils/homeModuleNav'
import {
  countHomeConfigRequests,
  MOCK_REMOTE_HOME_CONFIG,
  stubFetchHome503,
  stubFetchHomeConfig,
  stubFetchNetworkError,
} from './helpers/publicApiMock'

async function mountAppHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: Home },
      { path: '/depts', component: { template: '<div>depts</div>' } },
      { path: '/content/:segment', component: { template: '<div>content</div>' } },
      { path: '/content/:segment/:id', component: { template: '<div>detail</div>' } },
    ],
  })
  await router.push('/home')
  await router.isReady()
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(App, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return { wrapper, router, pinia }
}

describe('Public Home API 对接', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('成功请求 /api/public/home/config 后渲染真实首页配置', async () => {
    const spy = stubFetchHomeConfig()
    const { wrapper } = await mountAppHome()

    expect(wrapper.text()).toContain(MOCK_REMOTE_HOME_CONFIG.title)
    expect(wrapper.text()).toContain(MOCK_REMOTE_HOME_CONFIG.subtitle)
    expect(wrapper.text()).toContain('远程高频事项')
    expect(wrapper.text()).toContain('政策公开')
    expect(wrapper.text()).toContain('远程通知')

    const store = useHomeConfigStore()
    expect(store.source).toBe('remote')
    expect(countHomeConfigRequests(spy)).toBe(1)
  })

  it('HTTP 503 使用本地离线配置', async () => {
    stubFetchHome503()
    const { wrapper } = await mountAppHome()

    expect(wrapper.text()).toContain(OFFLINE_HOME_CONFIG.title)
    expect(wrapper.text()).toContain('按部门查')
    expect(wrapper.text()).not.toMatch(/示例/)

    const store = useHomeConfigStore()
    expect(store.source).toBe('offline')
    expect(OFFLINE_HOME_CONFIG.homeHotItems).toEqual([])
  })

  it('网络失败使用本地离线配置', async () => {
    stubFetchNetworkError()
    const { wrapper } = await mountAppHome()

    expect(wrapper.text()).toContain(OFFLINE_HOME_CONFIG.title)
    expect(wrapper.text()).not.toContain('数据加载失败')

    const store = useHomeConfigStore()
    expect(store.source).toBe('offline')
  })

  it('App 与 Home 共享单一 home/config 请求', async () => {
    const spy = stubFetchHomeConfig()
    await mountAppHome()
    expect(countHomeConfigRequests(spy)).toBe(1)
  })

  it('模块点击按配置跳转', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/home', component: Home },
        { path: '/depts', component: { template: '<div>depts</div>' } },
        { path: '/content/:segment', component: { template: '<div>content</div>' } },
      ],
    })
    await router.push('/home')
    await router.isReady()

    await navigateHomeModule(router, {
      moduleCode: 'guide_dept',
      moduleName: '按部门查',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: null,
      targetType: 'route',
      targetValue: '/depts',
    })
    expect(router.currentRoute.value.path).toBe('/depts')

    await navigateHomeModule(router, {
      moduleCode: 'content_policies',
      moduleName: '政策公开',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: null,
      targetType: 'content',
      targetValue: 'policies',
    })
    expect(router.currentRoute.value.path).toBe('/content/policies')
  })
})

describe('Public Home API 安全约束', () => {
  it('fetch 不调用 /api/admin/*', async () => {
    const spy = stubFetchHomeConfig()
    await mountAppHome()
    for (const call of spy.mock.calls) {
      expect(String(call[0])).not.toMatch(/\/api\/admin\//)
    }
  })
})
