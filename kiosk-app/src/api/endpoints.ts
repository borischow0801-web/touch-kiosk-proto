import { apiGet, apiPost } from './client'
import type { AppConfig, Dept, Theme, ItemType, Item, ItemDetail, PageResult } from './types'

function buildQuery(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && String(v) !== '') p.append(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const getConfig = () =>
  apiGet<AppConfig>('/api/public/home/config')

export const getDepts = (params?: { hot?: string }) =>
  apiGet<Dept[]>(`/api/public/service-guide/depts${buildQuery(params ?? {})}`)

export const getDeptItemTypes = (deptCode: string) =>
  apiGet<ItemType[]>(`/api/public/service-guide/depts/${encodeURIComponent(deptCode)}/item-types`)

export const getThemes = (params?: { hot?: string }) =>
  apiGet<Theme[]>(`/api/public/service-guide/themes${buildQuery(params ?? {})}`)

export const getThemeItemTypes = (themeCode: string) =>
  apiGet<ItemType[]>(`/api/public/service-guide/themes/${encodeURIComponent(themeCode)}/item-types`)

export const getItems = (params: {
  deptCode?: string
  themeCode?: string
  itemTypeCode?: string
  page?: number
  pageSize?: number
}) =>
  apiGet<PageResult<Item>>(`/api/public/service-guide/items${buildQuery(params)}`)

export const getItemDetail = (itemId: string) =>
  apiGet<ItemDetail>(`/api/public/service-guide/items/${encodeURIComponent(itemId)}`)

export const postClick = (payload: { type: string; id?: string; ts?: number }) =>
  apiPost<{ ok: true }>('/api/public/stats/click', payload)

export const postPageView = (payload: { path: string; ts?: number }) =>
  apiPost<{ ok: true }>('/api/public/stats/page-view', payload)
