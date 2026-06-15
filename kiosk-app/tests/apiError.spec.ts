import { describe, expect, it } from 'vitest'
import { ApiError, isApiError } from '../src/api/errors'
import { formatApiErrorMessage } from '../src/utils/apiError'

describe('ApiError', () => {
  it('identifies 404 by httpStatus', () => {
    const err = new ApiError('事项不存在', { httpStatus: 404 })
    expect(err.isNotFound).toBe(true)
    expect(isApiError(err)).toBe(true)
  })

  it('identifies 404 by business code', () => {
    const err = new ApiError('事项不存在', { code: 404 })
    expect(err.isNotFound).toBe(true)
  })

  it('500 message containing 不存在 is not notFound', () => {
    const err = new ApiError('记录不存在于当前批次', { httpStatus: 500, code: 500 })
    expect(err.isNotFound).toBe(false)
  })
})

describe('formatApiErrorMessage', () => {
  it('maps 502/503/504 to friendly text', () => {
    expect(formatApiErrorMessage(undefined, 502)).toContain('暂时不可用')
    expect(formatApiErrorMessage(undefined, 503)).toContain('办事指南服务暂不可用')
    expect(formatApiErrorMessage(undefined, 504)).toContain('超时')
  })

  it('404 uses message when provided', () => {
    expect(formatApiErrorMessage('事项 i-001 不存在', 404)).toContain('不存在')
  })
})
