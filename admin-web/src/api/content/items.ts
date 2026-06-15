import { adminDelete, adminGet, adminPost, adminPut } from '@/api/http'
import type {
  CreateItemPayload,
  ItemDetail,
  ItemListItem,
  ItemListQuery,
  PageResult,
  UpdateItemPayload,
  VersionDetail,
  VersionListItem,
} from './types'

function toQueryParams(query: ItemListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (query.page != null) params.page = query.page
  if (query.pageSize != null) params.pageSize = query.pageSize
  if (query.contentType) params.contentType = query.contentType
  if (query.categoryId) params.categoryId = query.categoryId
  if (query.status) params.status = query.status
  if (query.title) params.title = query.title
  return params
}

export function fetchItemsApi(query: ItemListQuery = {}): Promise<PageResult<ItemListItem>> {
  return adminGet<PageResult<ItemListItem>>('/content/items', { params: toQueryParams(query) })
}

export function fetchItemApi(id: string): Promise<ItemDetail> {
  return adminGet<ItemDetail>(`/content/items/${id}`)
}

export function createItemApi(payload: CreateItemPayload): Promise<ItemDetail> {
  return adminPost<ItemDetail>('/content/items', payload)
}

export function updateItemApi(id: string, payload: UpdateItemPayload): Promise<ItemDetail> {
  return adminPut<ItemDetail>(`/content/items/${id}`, payload)
}

export function deleteItemApi(id: string): Promise<void> {
  return adminDelete<void>(`/content/items/${id}`)
}

export function fetchItemVersionsApi(id: string): Promise<VersionListItem[]> {
  return adminGet<VersionListItem[]>(`/content/items/${id}/versions`)
}

export function fetchVersionApi(versionId: string): Promise<VersionDetail> {
  return adminGet<VersionDetail>(`/content/versions/${versionId}`)
}
