const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'span',
])

/** 危险节点整体删除（不解包），防止 script/SVG/MathML 等残留 */
const DANGEROUS_TAGS = new Set([
  'script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta', 'base', 'frame',
  'frameset', 'applet', 'svg', 'math', 'input', 'textarea', 'button', 'img', 'a', 'audio',
  'video', 'source', 'track', 'picture', 'canvas', 'noscript',
])

const VOID_TAGS = new Set(['br'])

export function isDomParserAvailable(): boolean {
  return typeof DOMParser !== 'undefined'
}

/** 是否包含 HTML 标签 */
export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function stripAllTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * 群众端正文白名单清理。
 * - 危险标签整体删除
 * - 非白名单标签解包后递归清理子节点
 * - 允许标签移除全部属性
 * - 无 DOMParser 时降级为纯文本转义展示
 */
export function sanitizePublicBody(raw: string): string {
  if (!raw) return ''
  if (!isDomParserAvailable()) {
    return escapeHtmlText(stripAllTags(raw))
  }
  return sanitizeWithDomParser(raw)
}

function preStripDangerousMarkup(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
}

function sanitizeWithDomParser(html: string): string {
  const safeInput = preStripDangerousMarkup(html)
  const doc = new DOMParser().parseFromString(`<body>${safeInput}</body>`, 'text/html')
  return [...doc.body.childNodes].map((node) => serializeSanitizedNode(node)).join('')
}

function serializeSanitizedNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHtmlText(node.textContent ?? '')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const el = node as Element
  const tag = el.tagName.toLowerCase()

  if (DANGEROUS_TAGS.has(tag)) {
    return ''
  }

  const inner = [...el.childNodes].map((child) => serializeSanitizedNode(child)).join('')

  if (!ALLOWED_TAGS.has(tag)) {
    return inner
  }

  if (VOID_TAGS.has(tag)) {
    return `<${tag}>`
  }
  return `<${tag}>${inner}</${tag}>`
}

/** 断言输出不含常见 XSS 向量（测试辅助） */
export function containsDangerousMarkup(html: string): boolean {
  const lower = html.toLowerCase()
  if (/<script\b/i.test(html)) return true
  if (/\bon[a-z]+\s*=/i.test(html)) return true
  if (/javascript:/i.test(html)) return true
  if (/data:/i.test(html)) return true
  if (/\bstyle\s*=/i.test(html)) return true
  if (/\bclass\s*=/i.test(html)) return true
  if (/\bid\s*=/i.test(html)) return true
  if (/\b(src|href)\s*=/i.test(html)) return true
  if (/<(svg|math|iframe|object|embed)\b/i.test(lower)) return true
  return false
}
