import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { registerAuthGuard } from '@/router/index'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/api/auth', () => ({
  loginApi: vi.fn(),
  fetchProfileApi: vi.fn(),
  logoutApi: vi.fn(),
}))

const StubPage = { template: '<div class="stub" />' }

const guideTestRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: StubPage, meta: { public: true } },
  { path: '/forbidden', name: 'forbidden', component: StubPage },
  {
    path: '/guide/depts',
    name: 'guide-depts',
    component: StubPage,
    meta: { permission: 'guide:dept:read' },
  },
  {
    path: '/guide/themes',
    name: 'guide-themes',
    component: StubPage,
    meta: { permission: 'guide:theme:read' },
  },
  {
    path: '/guide/item-configs',
    name: 'guide-item-configs',
    component: StubPage,
    meta: { permission: 'guide:item:read' },
  },
]

function createGuideRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: guideTestRoutes,
  })
  registerAuthGuard(router)
  return router
}

describe('办事指南路由权限守卫', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('无 guide:dept:read 访问部门页跳转 403', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.permissions = ['guide:theme:read']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createGuideRouter()
    await router.push('/guide/depts')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('有 guide:item:read 可进入事项配置页', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.permissions = ['guide:item:read']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createGuideRouter()
    await router.push('/guide/item-configs')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('guide-item-configs')
  })

  it('SUPER_ADMIN 可访问主题映射页', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.roles = ['SUPER_ADMIN']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createGuideRouter()
    await router.push('/guide/themes')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('guide-themes')
  })
})
