/** 办事指南路由参数校验 — 缺失或非法时安全降级 */

const GUIDE_CODE_RE = /^[a-zA-Z0-9\-_]{1,50}$/
const ITEM_ID_RE = /^[a-zA-Z0-9\-_]{1,60}$/
const MAX_PAGE = 9999
/** 完整匹配正整数，禁止 parseInt 部分容错 */
const STRICT_PAGE_RE = /^[1-9]\d*$/

function parseStrictPageString(str: string, maxPage = MAX_PAGE): number | null {
  if (!STRICT_PAGE_RE.test(str)) return null
  const n = Number(str)
  if (n < 1 || n > maxPage) return null
  return n
}

/** 安全提取单值 query / param，拒绝数组、对象与空白 */
export function extractQueryString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  if (Array.isArray(value)) {
    if (value.length !== 1) return undefined
    return extractQueryString(value[0])
  }
  return undefined
}

export function parsePageQuery(value: unknown, maxPage = MAX_PAGE): number {
  const str = extractQueryString(value)
  if (!str) return 1
  return parseStrictPageString(str, maxPage) ?? 1
}

export function isInvalidPageQuery(value: unknown, maxPage = MAX_PAGE): boolean {
  const str = extractQueryString(value)
  if (!str) return false
  return parseStrictPageString(str, maxPage) === null
}

export function isValidGuideCode(value: unknown): value is string {
  const str = extractQueryString(value)
  if (!str) return false
  return GUIDE_CODE_RE.test(str)
}

export function isValidItemId(value: unknown): value is string {
  const str = extractQueryString(value)
  if (!str) return false
  return ITEM_ID_RE.test(str)
}

export function getGuideCode(value: unknown): string | undefined {
  return isValidGuideCode(value) ? extractQueryString(value) : undefined
}

export function getItemIdParam(value: unknown): string | undefined {
  return isValidItemId(value) ? extractQueryString(value) : undefined
}

export function resolveItemTypeContext(query: {
  deptCode?: unknown
  themeCode?: unknown
}): 'dept' | 'theme' | null {
  const deptValid = isValidGuideCode(query.deptCode)
  const themeValid = isValidGuideCode(query.themeCode)
  if (deptValid && themeValid) return null
  if (deptValid) return 'dept'
  if (themeValid) return 'theme'
  return null
}

export function resolveItemListContext(query: {
  deptCode?: unknown
  themeCode?: unknown
  itemTypeCode?: unknown
}): boolean {
  const mode = resolveItemTypeContext(query)
  if (!mode) return false
  return isValidGuideCode(query.itemTypeCode)
}

export function buildListScopeKey(query: {
  deptCode?: unknown
  themeCode?: unknown
  itemTypeCode?: unknown
}): string | null {
  const mode = resolveItemTypeContext(query)
  const itemType = getGuideCode(query.itemTypeCode)
  if (!mode || !itemType) return null
  if (mode === 'dept') {
    const dept = getGuideCode(query.deptCode)
    return dept ? `dept:${dept}:${itemType}` : null
  }
  const theme = getGuideCode(query.themeCode)
  return theme ? `theme:${theme}:${itemType}` : null
}
