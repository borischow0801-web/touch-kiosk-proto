import { adminGet, adminPost } from './http'
import type { LoginPayload, LoginResult, ProfileResult } from './types'

export function loginApi(payload: LoginPayload): Promise<LoginResult> {
  return adminPost<LoginResult>('/auth/login', payload)
}

export function fetchProfileApi(): Promise<ProfileResult> {
  return adminGet<ProfileResult>('/auth/profile')
}

export function logoutApi(): Promise<null> {
  return adminPost<null>('/auth/logout')
}
