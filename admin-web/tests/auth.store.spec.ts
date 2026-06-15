import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/api/http'
import * as authApi from '@/api/auth'
import { getStoredToken } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/api/auth', () => ({
  loginApi: vi.fn(),
  fetchProfileApi: vi.fn(),
  logoutApi: vi.fn(),
}))

const mockedLogin = vi.mocked(authApi.loginApi)
const mockedProfile = vi.mocked(authApi.fetchProfileApi)
const mockedLogout = vi.mocked(authApi.logoutApi)

const user = {
  id: 'u-1',
  username: 'editor',
  realName: '编辑员',
  status: 'active',
}

const loginResult = {
  accessToken: 'jwt-token',
  userInfo: user,
  permissions: ['content:read'],
}

function expectSessionCleared(auth: ReturnType<typeof useAuthStore>): void {
  expect(getStoredToken()).toBe('')
  expect(auth.token).toBe('')
  expect(auth.userInfo).toBeNull()
  expect(auth.roles).toEqual([])
  expect(auth.permissions).toEqual([])
  expect(auth.isLoggedIn).toBe(false)
}

describe('auth store 登录原子性与回滚', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    mockedLogin.mockReset()
    mockedProfile.mockReset()
    mockedLogout.mockReset()
  })

  it('登录成功后保存 Token 与 profile 认证数据', async () => {
    mockedLogin.mockResolvedValueOnce(loginResult)
    mockedProfile.mockResolvedValueOnce({
      userInfo: user,
      roles: ['CONTENT_EDITOR'],
      permissions: ['content:read'],
    })

    const auth = useAuthStore()
    await auth.login('editor', 'secret')

    expect(getStoredToken()).toBe('jwt-token')
    expect(auth.userInfo?.username).toBe('editor')
    expect(auth.roles).toContain('CONTENT_EDITOR')
    expect(auth.isLoggedIn).toBe(true)
  })

  it('login 成功、profile 业务 401 时完整回滚', async () => {
    mockedLogin.mockResolvedValueOnce(loginResult)
    mockedProfile.mockRejectedValueOnce(new ApiError('未登录或登录已过期', 401))

    const auth = useAuthStore()
    await expect(auth.login('editor', 'secret')).rejects.toThrow('未登录或登录已过期')
    expectSessionCleared(auth)
  })

  it('login 成功、profile HTTP 500 时完整回滚', async () => {
    mockedLogin.mockResolvedValueOnce(loginResult)
    mockedProfile.mockRejectedValueOnce(new ApiError('服务器内部错误', 500))

    const auth = useAuthStore()
    await expect(auth.login('editor', 'secret')).rejects.toThrow('服务器内部错误')
    expectSessionCleared(auth)
  })

  it('login 成功、profile 网络失败时完整回滚', async () => {
    mockedLogin.mockResolvedValueOnce(loginResult)
    mockedProfile.mockRejectedValueOnce(new ApiError('网络连接失败，请检查网络', 500))

    const auth = useAuthStore()
    await expect(auth.login('editor', 'secret')).rejects.toThrow('网络连接失败')
    expectSessionCleared(auth)
  })

  it('profile 失败后重新登录可成功', async () => {
    mockedLogin.mockResolvedValueOnce(loginResult)
    mockedProfile.mockRejectedValueOnce(new ApiError('未登录或登录已过期', 401))

    const auth = useAuthStore()
    await expect(auth.login('editor', 'bad')).rejects.toThrow()
    expectSessionCleared(auth)

    mockedLogin.mockResolvedValueOnce({ ...loginResult, accessToken: 'jwt-retry' })
    mockedProfile.mockResolvedValueOnce({
      userInfo: user,
      roles: ['CONTENT_EDITOR'],
      permissions: ['content:read'],
    })

    await auth.login('editor', 'secret')
    expect(getStoredToken()).toBe('jwt-retry')
    expect(auth.isLoggedIn).toBe(true)
  })

  it('登录 API 失败不保存 Token', async () => {
    mockedLogin.mockRejectedValueOnce(new ApiError('用户名或密码错误', 401))

    const auth = useAuthStore()
    await expect(auth.login('bad', 'wrong')).rejects.toThrow('用户名或密码错误')
    expectSessionCleared(auth)
  })

  it('profile 可恢复会话', async () => {
    sessionStorage.setItem('admin_access_token', 'stored-token')
    mockedProfile.mockResolvedValueOnce({
      userInfo: user,
      roles: ['PUBLISH_REVIEWER'],
      permissions: ['publish:approve'],
    })

    const auth = useAuthStore()
    auth.token = 'stored-token'
    const ok = await auth.ensureSession()

    expect(ok).toBe(true)
    expect(auth.userInfo?.id).toBe('u-1')
    expect(auth.roles).toContain('PUBLISH_REVIEWER')
  })

  it('profile 401 时清理会话', async () => {
    sessionStorage.setItem('admin_access_token', 'expired')
    mockedProfile.mockRejectedValueOnce(new ApiError('未登录或登录已过期', 401))

    const auth = useAuthStore()
    auth.token = 'expired'
    const ok = await auth.ensureSession()

    expect(ok).toBe(false)
    expectSessionCleared(auth)
  })

  it('SUPER_ADMIN 角色拥有全部权限', () => {
    const auth = useAuthStore()
    auth.roles = ['SUPER_ADMIN']
    auth.permissions = []
    expect(auth.hasPermission('any:code')).toBe(true)
  })

  it('permissions 含 * 时拥有全部权限', () => {
    const auth = useAuthStore()
    auth.roles = []
    auth.permissions = ['*']
    expect(auth.hasPermission('publish:approve')).toBe(true)
  })

  it('普通权限码精确匹配', () => {
    const auth = useAuthStore()
    auth.permissions = ['content:read']
    expect(auth.hasPermission('content:read')).toBe(true)
    expect(auth.hasPermission('content:write')).toBe(false)
  })

  it('退出登录清理状态', async () => {
    mockedLogout.mockResolvedValueOnce(null)
    const auth = useAuthStore()
    auth.token = 'jwt'
    auth.userInfo = user
    auth.roles = ['CONTENT_EDITOR']
    auth.permissions = ['content:read']
    sessionStorage.setItem('admin_access_token', 'jwt')

    await auth.logout()

    expect(mockedLogout).toHaveBeenCalled()
    expectSessionCleared(auth)
  })
})
