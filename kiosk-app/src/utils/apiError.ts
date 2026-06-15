/** 群众端 API 错误文案 — 不暴露后台字段或凭据 */

export function formatApiErrorMessage(
  message: string | undefined,
  status?: number,
): string {
  if (status === 502) return '服务暂时不可用，请稍后重试'
  if (status === 503) return '办事指南服务暂不可用，请稍后重试'
  if (status === 504) return '服务响应超时，请稍后重试'
  if (status === 404) return message?.trim() || '未找到相关内容'
  if (message?.trim()) return message.trim()
  if (status) return `请求失败（${status}）`
  return '请求失败，请稍后重试'
}
