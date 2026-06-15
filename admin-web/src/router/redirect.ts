/** 仅允许站内相对路径，防止开放重定向 */
export function safeRedirectPath(raw: unknown, fallback = '/dashboard'): string {
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (raw.startsWith('/login')) return fallback
  return raw
}
