import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http, setUnauthorizedHandler, setStoredToken, clearStoredToken } from '@/api/http'

describe('HTTP 401 处理', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
    clearStoredToken()
    setUnauthorizedHandler(null)
  })

  afterEach(() => {
    mock.restore()
  })

  it('业务 code=401 触发会话清理回调', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    setStoredToken('old-token')

    mock.onGet('/auth/profile').reply(200, {
      code: 401,
      message: '未登录或登录已过期',
      data: null,
      timestamp: Date.now(),
      requestId: 'req-1',
    })

    await expect(http.get('/auth/profile')).rejects.toThrow('未登录或登录已过期')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('HTTP 401 触发会话清理回调', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    mock.onGet('/auth/profile').reply(401, {
      code: 401,
      message: '未登录或登录已过期',
      data: null,
      timestamp: Date.now(),
      requestId: 'req-2',
    })

    await expect(http.get('/auth/profile')).rejects.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
