import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import KioskBottomNav from '../src/components/KioskBottomNav.vue'
import { useContentStore } from '../src/stores/content'
import { useGuideStore } from '../src/stores/guide'

const navItems = [
  { label: '首页', to: '/home' },
  { label: '返回', to: 'BACK' },
  { label: '重来', to: '/home?reset=1' },
  { label: '帮助', to: '/help' },
]

async function setupRouter(initialPath = '/content/policies') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: { template: '<div>home</div>' } },
      { path: '/content/policies', component: { template: '<div>list</div>' } },
      { path: '/help', component: { template: '<div>help</div>' } },
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  return router
}

describe('底部导航状态语义', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('首页：清理 guideStore 与 contentStore', async () => {
    const router = await setupRouter()
    const guide = useGuideStore()
    const content = useContentStore()
    guide.deptCode = 'D1'
    content.rememberList('policies', 3)
    content.rememberDetail('policies', 'x1')

    const wrapper = mount(KioskBottomNav, {
      props: { items: navItems },
      global: { plugins: [pinia, router] },
    })

    await wrapper.findAll('button')[0].trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/home'))
    expect(guide.deptCode).toBe('')
    expect(content.page).toBe(1)
    expect(content.detailId).toBe('')
  })

  it('返回：保留 contentStore 页码', async () => {
    const router = await setupRouter()
    const content = useContentStore()
    content.rememberList('policies', 3)

    const back = vi.spyOn(router, 'back').mockImplementation(async () => {
      await router.push('/home')
    })

    const wrapper = mount(KioskBottomNav, {
      props: { items: navItems },
      global: { plugins: [pinia, router] },
    })

    await wrapper.findAll('button')[1].trigger('click')
    expect(back).toHaveBeenCalled()
    expect(content.page).toBe(3)
    expect(content.listType).toBe('policies')
  })

  it('重来：跳转 reset=1（完整清理由 App 生命周期测试覆盖）', async () => {
    const router = await setupRouter()
    const content = useContentStore()
    content.rememberList('policies', 2)

    const wrapper = mount(KioskBottomNav, {
      props: { items: navItems },
      global: { plugins: [pinia, router] },
    })

    await wrapper.findAll('button')[2].trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/home?reset=1'))
  })
})
