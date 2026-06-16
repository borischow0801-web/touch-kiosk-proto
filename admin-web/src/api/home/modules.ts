import { adminDelete, adminGet, adminPost, adminPut } from '@/api/http'
import type {
  CreateHomeModulePayload,
  HomeModuleItem,
  HomeModuleListResponse,
  SortHomeModulesPayload,
  UpdateHomeModulePayload,
} from './types'

export function fetchHomeModulesApi(): Promise<HomeModuleListResponse> {
  return adminGet<HomeModuleListResponse>('/home/modules')
}

export function createHomeModuleApi(payload: CreateHomeModulePayload): Promise<HomeModuleItem> {
  return adminPost<HomeModuleItem>('/home/modules', payload)
}

export function updateHomeModuleApi(id: string, payload: UpdateHomeModulePayload): Promise<HomeModuleItem> {
  return adminPut<HomeModuleItem>(`/home/modules/${id}`, payload)
}

export function deleteHomeModuleApi(id: string): Promise<void> {
  return adminDelete<void>(`/home/modules/${id}`)
}

export function sortHomeModulesApi(payload: SortHomeModulesPayload): Promise<HomeModuleListResponse> {
  return adminPut<HomeModuleListResponse>('/home/modules/sort', payload)
}
