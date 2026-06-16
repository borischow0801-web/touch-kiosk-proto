import type { AdminHomeConfig, HomeDraftVersionDetail } from '@/api/home/types'

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string }

export function formatJsonForEditor(value: unknown): string {
  if (value === null || value === undefined) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

export function parseJsonField(text: string, fieldLabel: string): JsonParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: true, value: undefined }
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown }
  } catch {
    return { ok: false, message: `${fieldLabel} JSON 格式不正确，请检查后重试` }
  }
}

export function buildSortItems(
  modules: Array<{ id: string; sortOrder: number }>,
): { ok: true; items: Array<{ id: string; sortOrder: number }> } | { ok: false; message: string } {
  if (modules.length === 0) {
    return { ok: false, message: '没有可排序的模块' }
  }
  const ids = modules.map((m) => m.id)
  const orders = modules.map((m) => m.sortOrder)
  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: '模块 id 重复，无法提交排序' }
  }
  if (new Set(orders).size !== orders.length) {
    return { ok: false, message: 'sortOrder 重复，请调整后再保存' }
  }
  return {
    ok: true,
    items: [...modules]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({ id: m.id, sortOrder: m.sortOrder })),
  }
}

export function emptyDraftForm(): {
  title: string
  subtitle: string
  topBannerText: string
  themeText: string
  changeRemark: string
} {
  return {
    title: '',
    subtitle: '',
    topBannerText: '',
    themeText: '',
    changeRemark: '',
  }
}

export function draftFormFromConfig(
  draft: HomeDraftVersionDetail | null,
): ReturnType<typeof emptyDraftForm> {
  if (!draft) return emptyDraftForm()
  return {
    title: draft.title,
    subtitle: draft.subtitle ?? '',
    topBannerText: formatJsonForEditor(draft.topBannerJson),
    themeText: formatJsonForEditor(draft.themeJson),
    changeRemark: draft.changeRemark ?? '',
  }
}

export function configHasPendingReview(
  config: AdminHomeConfig,
  records: Array<{ action: string; toStatus: string }>,
): boolean {
  if (config.status === 'pending') return true
  if (records.length === 0) return false
  const latest = records[0]
  return latest.action === 'submit' && latest.toStatus === 'pending'
}

export function canEditHomeDraft(config: AdminHomeConfig): boolean {
  return Boolean(config.draftVersion) || config.status === null || config.id === null
}
