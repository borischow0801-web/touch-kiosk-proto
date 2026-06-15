const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** 校验多行文本是否为合法 JSON（空文本视为合法） */
export function isValidJsonText(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

/** 关联内容 ID 须为 UUID v4，与后端 IsUUID('4') 一致 */
export function isUuidV4(value: string): boolean {
  return UUID_V4_RE.test(value.trim())
}

export function nullableTextField(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
