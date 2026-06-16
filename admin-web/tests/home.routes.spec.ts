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

const homeTestRoutes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: StubPage, meta: { public: true } },
  { path: '/forbidden', name: 'forbidden', component: StubPage },
  {
    path: '/home/config',
    name: 'home-config',
    component: StubPage,
    meta: { permission: 'home:config:read' },
  },
]

function createHomeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: homeTestRoutes,
  })
  registerAuthGuard(router)
  return router
}

describe('首页配置路由权限守卫', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('无 home:config:read 访问首页配置页跳转 403', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.permissions = ['content:item:read']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createHomeRouter()
    await router.push('/home/config')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('有 home:config:read 可进入首页配置页', async () => {
    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'u', realName: null, status: 'active' }
    auth.permissions = ['home:config:read']
    sessionStorage.setItem('admin_access_token', 'tok')

    const router = createHomeRouter()
    await router.push('/home/config')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('home-config')
  })
})
