import { FORBIDDEN_ITEM_WRITE_FIELDS } from '@/constants/content'
import type { CreateItemPayload, UpdateItemPayload } from '@/api/content/types'

const FORBIDDEN_SET = new Set<string>(FORBIDDEN_ITEM_WRITE_FIELDS)

export function buildCreateItemPayload(form: Record<string, unknown>): CreateItemPayload {
  const payload: Record<string, unknown> = {}
  const allowed: (keyof CreateItemPayload)[] = [
    'contentType',
    'title',
    'subtitle',
    'summary',
    'body',
    'extraJson',
    'categoryId',
    'changeRemark',
    'sortOrder',
  ]
  for (const key of allowed) {
    const val = form[key]
    if (val !== undefined && val !== null && val !== '') {
      payload[key] = val
    }
  }
  assertNoForbiddenFields(payload)
  return payload as unknown as CreateItemPayload
}

/**
 * 更新 payload：仅当调用方显式传入字段名时才纳入。
 * 空字符串表示清空；undefined 表示保持原值不提交。
 */
export function buildUpdateItemPayload(form: Record<string, unknown>): UpdateItemPayload {
  const payload: Record<string, unknown> = {}
  const allowed: (keyof UpdateItemPayload)[] = [
    'title',
    'subtitle',
    'summary',
    'body',
    'extraJson',
    'categoryId',
    'changeRemark',
    'sortOrder',
    'isTop',
    'isRecommend',
    'sourceType',
    'sourceUrl',
  ]
  for (const key of allowed) {
    if (!(key in form)) continue
    const val = form[key]
    if (val === undefined || val === null) continue
    payload[key] = val
  }
  assertNoForbiddenFields(payload)
  return payload as unknown as UpdateItemPayload
}

export function assertNoForbiddenFields(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_SET.has(key)) {
      throw new Error(`禁止提交字段: ${key}`)
    }
  }
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false })
}
