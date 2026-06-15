/** 后端统一响应信封 */
export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  timestamp: number
  requestId: string
}

export interface UserInfo {
  id: string
  username: string
  realName: string | null
  status: string
}

export interface LoginResult {
  accessToken: string
  userInfo: UserInfo
  permissions: string[]
}

export interface ProfileResult {
  userInfo: UserInfo
  roles: string[]
  permissions: string[]
}

export interface LoginPayload {
  username: string
  password: string
}
