import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from './types'

const TOKEN_STORAGE_KEY = 'admin_access_token'

export class ApiError extends Error {
  readonly code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

let unauthorizedHandler: (() => void) | null = null
let redirectingToLogin = false

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export function getStoredToken(): string {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
}

export function setStoredToken(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
}

function triggerUnauthorized(): void {
  if (redirectingToLogin) return
  redirectingToLogin = true
  try {
    unauthorizedHandler?.()
  } finally {
    queueMicrotask(() => {
      redirectingToLogin = false
    })
  }
}

function parseEnvelopeError(data: unknown, fallbackCode: number): ApiError {
  if (data && typeof data === 'object' && 'message' in data) {
    const body = data as ApiEnvelope<unknown>
    const code = typeof body.code === 'number' ? body.code : fallbackCode
    const message = typeof body.message === 'string' ? body.message : '请求失败'
    return new ApiError(message, code)
  }
  return new ApiError('请求失败', fallbackCode)
}

export const http: AxiosInstance = axios.create({
  baseURL: '/api/admin',
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown>
    if (!body || typeof body.code !== 'number') {
      return Promise.reject(new ApiError('响应格式错误', 500))
    }
    if (body.code !== 0) {
      if (body.code === 401) triggerUnauthorized()
      return Promise.reject(new ApiError(body.message || '请求失败', body.code))
    }
    return response
  },
  (error) => {
    const status = error.response?.status as number | undefined
    if (status === 401) {
      triggerUnauthorized()
      return Promise.reject(parseEnvelopeError(error.response?.data, 401))
    }
    if (error.response?.data) {
      return Promise.reject(parseEnvelopeError(error.response.data, status ?? 500))
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError('请求超时，请稍后重试', 504))
    }
    return Promise.reject(new ApiError('网络连接失败，请检查网络', 500))
  },
)

export async function adminGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<ApiEnvelope<T>>(url, config)
  return res.data.data
}

export async function adminPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.post<ApiEnvelope<T>>(url, data, config)
  return res.data.data
}

export async function adminPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await http.put<ApiEnvelope<T>>(url, data, config)
  return res.data.data
}

export async function adminDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<ApiEnvelope<T>>(url, config)
  return res.data.data
}
