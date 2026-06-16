/** 将 Public API theme 映射到 CSS 变量（缺省保留 tokens.css 默认值） */
export function applyThemeTokens(theme: Record<string, unknown>): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  const primary =
    typeof theme.primary === 'string'
      ? theme.primary
      : typeof theme.primaryColor === 'string'
        ? theme.primaryColor
        : null
  if (primary) root.style.setProperty('--kiosk-color-horizon', primary)

  if (typeof theme.accentGold === 'string') {
    root.style.setProperty('--kiosk-color-gold', theme.accentGold)
  }
  if (typeof theme.honorTint === 'string') {
    root.style.setProperty('--kiosk-color-honor-accent', theme.honorTint)
  }
  if (typeof theme.backgroundTop === 'string') {
    root.style.setProperty('--kiosk-color-sky-start', theme.backgroundTop)
  }
}
