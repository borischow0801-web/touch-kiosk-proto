export const ErrorCode = {
  SUCCESS: 0,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  UPSTREAM_ERROR: 502,
  SERVICE_UNAVAILABLE: 503,
  UPSTREAM_TIMEOUT: 504,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ERROR_MESSAGES: Record<number, string> = {
  [ErrorCode.SUCCESS]: '成功',
  [ErrorCode.BAD_REQUEST]: '请求参数错误',
  [ErrorCode.UNAUTHORIZED]: '未登录或登录已过期',
  [ErrorCode.FORBIDDEN]: '无权限',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.CONFLICT]: '状态冲突',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.UPSTREAM_ERROR]: '外部接口调用失败',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂不可用',
  [ErrorCode.UPSTREAM_TIMEOUT]: '外部接口超时',
};
