import { adminDelete, adminGet, adminPost, adminPut } from '@/api/http'
import type {
  CreateThemeMappingPayload,
  PageQuery,
  PageResult,
  ThemeMappingListItem,
  UpdateThemeMappingPayload,
} from './types'

function toQueryParams(query: PageQuery): Record<string, number> {
  const params: Record<string, number> = {}
  if (query.page != null) params.page = query.page
  if (query.pageSize != null) params.pageSize = query.pageSize
  return params
}

export function fetchThemesApi(query: PageQuery = {}): Promise<PageResult<ThemeMappingListItem>> {
  return adminGet<PageResult<ThemeMappingListItem>>('/guide/themes', { params: toQueryParams(query) })
}

export function createThemeApi(payload: CreateThemeMappingPayload): Promise<ThemeMappingListItem> {
  return adminPost<ThemeMappingListItem>('/guide/themes', payload)
}

export function updateThemeApi(
  id: string,
  payload: UpdateThemeMappingPayload,
): Promise<ThemeMappingListItem> {
  return adminPut<ThemeMappingListItem>(`/guide/themes/${id}`, payload)
}

export function deleteThemeApi(id: string): Promise<void> {
  return adminDelete<void>(`/guide/themes/${id}`)
}
