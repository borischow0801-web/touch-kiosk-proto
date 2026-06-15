import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MockAdapter from 'axios-mock-adapter'
import { http, getStoredToken, clearStoredToken } from '@/api/http'
import { registerAuthGuard } from '@/router/index'
import { useAuthStore } from '@/stores/auth'
import * as authApi from '@/api/auth'

vi.mock('@/api/auth', () => ({
  loginApi: vi.fn(),
  fetchProfileApi: vi.fn(),
  logoutApi: vi.fn(),
}))

const mockedProfile = vi.mocked(authApi.fetchProfileApi)

function createTestRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/waiting', component: { template: '<div>wait</div>' }, meta: { public: true } },
      { path: '/login', component: { template: '<div>login</div>' }, meta: { public: true } },
      { path: '/dashboard', component: { template: '<div>dash</div>' }, meta: { requiresAuth: true } },
    ],
  })
  registerAuthGuard(router)
  return router
}

describe('路由守卫', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    mockedProfile.mockReset()
  })

  it('未登录访问受保护页面跳转 /login', async () => {
    const router = createTestRouter()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('已登录访问 /login 重定向 /dashboard', async () => {
    mockedProfile.mockResolvedValueOnce({
      userInfo: { id: '1', username: 'admin', realName: null, status: 'active' },
      roles: ['SUPER_ADMIN'],
      permissions: ['*'],
    })

    const auth = useAuthStore()
    auth.token = 'valid-token'
    sessionStorage.setItem('admin_access_token', 'valid-token')

    const router = createTestRouter()
    await router.push('/login')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('半登录状态（仅有 Token）不能进入 /dashboard', async () => {
    const mock = new MockAdapter(http)
    mock.onGet('/auth/profile').reply(200, {
      code: 401,
      message: '未登录或登录已过期',
      data: null,
      timestamp: Date.now(),
      requestId: 'r-half',
    })

    const auth = useAuthStore()
    auth.token = 'half-token'
    sessionStorage.setItem('admin_access_token', 'half-token')

    const router = createTestRouter()
    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(getStoredToken()).toBe('')
    expect(auth.isLoggedIn).toBe(false)
    mock.restore()
  })

  it('多 Router 实例使用最后注册的 unauthorized handler', async () => {
    const mock = new MockAdapter(http)
    const routerA = createTestRouter()
    const routerB = createTestRouter()

    await routerA.push('/waiting')
    await routerA.isReady()
    expect(routerA.currentRoute.value.path).toBe('/waiting')

    const auth = useAuthStore()
    auth.token = 'tok'
    auth.userInfo = { id: '1', username: 'admin', realName: null, status: 'active' }
    auth.roles = ['SUPER_ADMIN']
    auth.permissions = ['*']
    sessionStorage.setItem('admin_access_token', 'tok')

    await routerB.push('/dashboard')
    await routerB.isReady()
    expect(routerB.currentRoute.value.path).toBe('/dashboard')

    mock.onGet('/auth/ping').reply(401, {
      code: 401,
      message: '未登录或登录已过期',
      data: null,
      timestamp: Date.now(),
      requestId: 'r-401',
    })

    await expect(http.get('/auth/ping')).rejects.toThrow()
    await new Promise((r) => setTimeout(r, 0))

    expect(routerB.currentRoute.value.path).toBe('/login')
    expect(routerA.currentRoute.value.path).toBe('/waiting')
    mock.restore()
  })

  it('重复 registerAuthGuard 不叠加守卫', async () => {
    const router = createTestRouter()
    registerAuthGuard(router)
    registerAuthGuard(router)

    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
