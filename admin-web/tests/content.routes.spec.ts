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

const contentTestRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: StubPage, meta: { public: true } },
  { path: '/forbidden', name: 'forbidden', component: StubPage },
  {
    path: '/content/categories',
    name: 'content-categories',
    component: StubPage,
    meta: { permission: 'content:category:read' },
  },
  {
    path: '/content/items',
    name: 'content-items',
    component: StubPage,
    meta: { permission: 'content:item:read' },
  },
]

function createContentRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: contentTestRoutes,
  })
  registerAuthGuard(router)
  return router
}

describe('内容路由权限守卫', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('无 content:category:read 访问分类页跳转 403', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.permissions = ['content:item:read']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createContentRouter()
    await router.push('/content/categories')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('有 content:category:read 可进入分类页', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.permissions = ['content:category:read']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createContentRouter()
    await router.push('/content/categories')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('content-categories')
  })

  it('SUPER_ADMIN 可访问内容列表', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.roles = ['SUPER_ADMIN']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createContentRouter()
    await router.push('/content/items')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('content-items')
  })
})
