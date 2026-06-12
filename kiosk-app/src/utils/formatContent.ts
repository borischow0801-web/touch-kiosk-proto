const EMPTY_TEXT = '暂无相关信息'

export function displayOrEmpty(value: string | null | undefined): string {
  const v = value?.trim()
  return v ? v : EMPTY_TEXT
}

export function formatPublishAt(value: string | null | undefined): string {
  if (!value) return EMPTY_TEXT
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return EMPTY_TEXT
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatSource(
  sourceType: string | null | undefined,
  sourceUrl: string | null | undefined,
): string {
  const parts = [sourceType?.trim(), sourceUrl?.trim()].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : EMPTY_TEXT
}
