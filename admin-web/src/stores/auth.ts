import { defineStore } from 'pinia'
import { loginApi, fetchProfileApi, logoutApi } from '@/api/auth'
import { ApiError } from '@/api/http'
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
} from '@/api/http'
import type { UserInfo } from '@/api/types'

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN'

interface AuthState {
  token: string
  userInfo: UserInfo | null
  roles: string[]
  permissions: string[]
  sessionChecked: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getStoredToken(),
    userInfo: null,
    roles: [],
    permissions: [],
    sessionChecked: false,
  }),

  getters: {
    isLoggedIn(state): boolean {
      return Boolean(state.token && state.userInfo)
    },
    displayName(state): string {
      return state.userInfo?.realName?.trim() || state.userInfo?.username || '管理员'
    },
  },

  actions: {
    bindUnauthorizedHandler(onUnauthorized: () => void): void {
      setUnauthorizedHandler(() => {
        this.clearSession()
        onUnauthorized()
      })
    },

    hasPermission(code: string): boolean {
      if (this.roles.includes(SUPER_ADMIN_ROLE)) return true
      if (this.permissions.includes('*')) return true
      return this.permissions.includes(code)
    },

    /** 登录成功以 profile 完成为准；profile 失败时回滚全部会话状态 */
    async login(username: string, password: string): Promise<void> {
      const result = await loginApi({ username, password })
      this.token = result.accessToken
      setStoredToken(result.accessToken)
      this.userInfo = null
      this.roles = []
      this.permissions = []
      this.sessionChecked = false
      try {
        await this.fetchProfile()
      } catch (e) {
        this.clearSession()
        throw e
      }
    },

    async fetchProfile(): Promise<void> {
      const profile = await fetchProfileApi()
      this.userInfo = profile.userInfo
      this.roles = profile.roles ?? []
      this.permissions = profile.permissions ?? []
      this.sessionChecked = true
    },

    async ensureSession(): Promise<boolean> {
      if (!this.token) {
        this.sessionChecked = true
        return false
      }
      if (this.userInfo) {
        this.sessionChecked = true
        return true
      }
      try {
        await this.fetchProfile()
        return true
      } catch {
        this.clearSession()
        return false
      }
    },

    async logout(): Promise<void> {
      try {
        if (this.token) await logoutApi()
      } catch {
        // 退出以客户端清理为准
      } finally {
        this.clearSession()
      }
    },

    clearSession(): void {
      this.token = ''
      this.userInfo = null
      this.roles = []
      this.permissions = []
      this.sessionChecked = true
      clearStoredToken()
    },
  },
})
