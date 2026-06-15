import { adminDelete, adminGet, adminPost, adminPut } from '@/api/http'
import type {
  CreateItemConfigPayload,
  ItemConfigListItem,
  ItemConfigListQuery,
  PageResult,
  UpdateItemConfigPayload,
} from './types'

function toQueryParams(query: ItemConfigListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (query.page != null) params.page = query.page
  if (query.pageSize != null) params.pageSize = query.pageSize
  if (query.deptCode) params.deptCode = query.deptCode
  if (query.themeCode) params.themeCode = query.themeCode
  if (query.isHot != null) params.isHot = query.isHot
  if (query.isRecommend != null) params.isRecommend = query.isRecommend
  if (query.isVisible != null) params.isVisible = query.isVisible
  return params
}

export function fetchItemConfigsApi(
  query: ItemConfigListQuery = {},
): Promise<PageResult<ItemConfigListItem>> {
  return adminGet<PageResult<ItemConfigListItem>>('/guide/item-configs', {
    params: toQueryParams(query),
  })
}

export function createItemConfigApi(
  payload: CreateItemConfigPayload,
): Promise<ItemConfigListItem> {
  return adminPost<ItemConfigListItem>('/guide/item-configs', payload)
}

export function updateItemConfigApi(
  id: string,
  payload: UpdateItemConfigPayload,
): Promise<ItemConfigListItem> {
  return adminPut<ItemConfigListItem>(`/guide/item-configs/${id}`, payload)
}

export function deleteItemConfigApi(id: string): Promise<void> {
  return adminDelete<void>(`/guide/item-configs/${id}`)
}
