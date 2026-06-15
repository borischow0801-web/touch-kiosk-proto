/** 群众端可识别 API 错误 — 仅暴露安全 message 与状态码 */

export class ApiError extends Error {
  readonly httpStatus?: number
  readonly code?: number

  constructor(
    message: string,
    options: { httpStatus?: number; code?: number } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.httpStatus = options.httpStatus
    this.code = options.code
  }

  get isNotFound(): boolean {
    return this.httpStatus === 404 || this.code === 404
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}
