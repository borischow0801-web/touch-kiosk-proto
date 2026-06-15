import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import MockAdapter from 'axios-mock-adapter'
import { http, getStoredToken, clearStoredToken } from '@/api/http'
import { registerAuthGuard } from '@/router/index'
import { useAuthStore } from '@/stores/auth'

/**
 * 端到端认证链路（HTTP mock，不依赖真实数据库）
 */
describe('认证链路', () => {
  let mock: MockAdapter

  const user = {
    id: 'u-1',
    username: 'testadmin',
    realName: '测试管理员',
    status: 'active',
  }

  function createAppRouter() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', component: { template: '<div>login</div>' }, meta: { public: true } },
        { path: '/dashboard', component: { template: '<div>dash</div>' }, meta: { requiresAuth: true } },
      ],
    })
    registerAuthGuard(router)
    return router
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    clearStoredToken()
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  it('未登录访问 /dashboard 跳转登录并保留 redirect', async () => {
    const router = createAppRouter()
    await router.push('/dashboard')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/dashboard')
  })

  it('登录成功进入首页并保存会话', async () => {
    mock.onPost('/auth/login').reply(200, {
      code: 0,
      message: '成功',
      data: {
        accessToken: 'jwt-ok',
        userInfo: user,
        permissions: ['content:read'],
      },
      timestamp: Date.now(),
      requestId: 'r1',
    })
    mock.onGet('/auth/profile').reply(200, {
      code: 0,
      message: '成功',
      data: { userInfo: user, roles: ['CONTENT_EDITOR'], permissions: ['content:read'] },
      timestamp: Date.now(),
      requestId: 'r2',
    })

    const auth = useAuthStore()
    await auth.login('testadmin', 'correct-password')

    expect(getStoredToken()).toBe('jwt-ok')
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.hasPermission('content:read')).toBe(true)
    expect(auth.hasPermission('content:write')).toBe(false)
  })

  it('刷新后通过 profile 恢复会话', async () => {
    sessionStorage.setItem('admin_access_token', 'jwt-refresh')
    mock.onGet('/auth/profile').reply(200, {
      code: 0,
      message: '成功',
      data: { userInfo: user, roles: ['SUPER_ADMIN'], permissions: ['*'] },
      timestamp: Date.now(),
      requestId: 'r3',
    })

    const auth = useAuthStore()
    auth.token = 'jwt-refresh'
    const router = createAppRouter()
    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/dashboard')
    expect(auth.userInfo?.username).toBe('testadmin')
    expect(auth.hasPermission('any:permission')).toBe(true)
  })

  it('Token 失效时清理会话并跳转登录', async () => {
    sessionStorage.setItem('admin_access_token', 'jwt-expired')
    mock.onGet('/auth/profile').reply(200, {
      code: 401,
      message: '未登录或登录已过期',
      data: null,
      timestamp: Date.now(),
      requestId: 'r4',
    })

    const auth = useAuthStore()
    auth.token = 'jwt-expired'
    const router = createAppRouter()
    await router.push('/dashboard')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(getStoredToken()).toBe('')
    expect(auth.isLoggedIn).toBe(false)
  })

  it('主动退出清理状态', async () => {
    mock.onPost('/auth/logout').reply(200, {
      code: 0,
      message: '成功',
      data: null,
      timestamp: Date.now(),
      requestId: 'r5',
    })

    const auth = useAuthStore()
    auth.token = 'jwt-logout'
    auth.userInfo = user
    auth.roles = ['CONTENT_EDITOR']
    auth.permissions = ['content:read']
    sessionStorage.setItem('admin_access_token', 'jwt-logout')

    await auth.logout()

    expect(getStoredToken()).toBe('')
    expect(auth.userInfo).toBeNull()
  })
})
