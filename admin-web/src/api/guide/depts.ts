import { adminDelete, adminGet, adminPost, adminPut } from '@/api/http'
import type {
  CreateDeptMappingPayload,
  DeptMappingListItem,
  PageQuery,
  PageResult,
  UpdateDeptMappingPayload,
} from './types'

function toQueryParams(query: PageQuery): Record<string, number> {
  const params: Record<string, number> = {}
  if (query.page != null) params.page = query.page
  if (query.pageSize != null) params.pageSize = query.pageSize
  return params
}

export function fetchDeptsApi(query: PageQuery = {}): Promise<PageResult<DeptMappingListItem>> {
  return adminGet<PageResult<DeptMappingListItem>>('/guide/depts', { params: toQueryParams(query) })
}

export function createDeptApi(payload: CreateDeptMappingPayload): Promise<DeptMappingListItem> {
  return adminPost<DeptMappingListItem>('/guide/depts', payload)
}

export function updateDeptApi(
  id: string,
  payload: UpdateDeptMappingPayload,
): Promise<DeptMappingListItem> {
  return adminPut<DeptMappingListItem>(`/guide/depts/${id}`, payload)
}

export function deleteDeptApi(id: string): Promise<void> {
  return adminDelete<void>(`/guide/depts/${id}`)
}
