const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'span',
])

const FORBIDDEN_TAG_RE = /<\s*\/?\s*(script|iframe|object|embed|form|input|textarea|button|link|meta|style)[\s>]/gi
const EVENT_ATTR_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URL_RE = /\s+(href|src)\s*=\s*("|')\s*javascript:/gi

/** 是否包含 HTML 标签 */
export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text)
}

/**
 * 轻量白名单清理：移除危险标签、事件属性与 javascript: URL。
 * 测试环境无 DOMParser 时使用正则兜底。
 */
export function sanitizePublicBody(raw: string): string {
  if (!raw) return ''
  let text = raw.replace(FORBIDDEN_TAG_RE, '')
  text = text.replace(EVENT_ATTR_RE, '')
  text = text.replace(JAVASCRIPT_URL_RE, '')

  if (typeof DOMParser !== 'undefined') {
    return sanitizeWithDomParser(text)
  }
  return text
}

function sanitizeWithDomParser(html: string): string {
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html')
  const root = doc.getElementById('root')
  if (!root) return ''
  sanitizeNode(root)
  return root.innerHTML
}

function sanitizeNode(node: Node): void {
  const children = [...node.childNodes]
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) {
        el.replaceWith(...el.childNodes)
        continue
      }
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase()
        if (name.startsWith('on') || (name === 'href' && attr.value.trim().toLowerCase().startsWith('javascript:'))) {
          el.removeAttribute(attr.name)
        }
      }
      sanitizeNode(el)
    }
  }
}
