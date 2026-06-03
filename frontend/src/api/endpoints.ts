import { apiGet, apiPost } from './client'
import type { AppConfig, Dept, Topic, Item, ItemDetail } from './types'
export const getConfig = () => apiGet<AppConfig>('/api/config')
export const getDepts = (q?: string) => apiGet<Dept[]>(q ? `/api/depts${q}` : '/api/depts')
export const getTopics = (q?: string) => apiGet<Topic[]>(q ? `/api/topics${q}` : '/api/topics')
export const getItems = (q?: string) => apiGet<Item[]>(q ? `/api/items${q}` : '/api/items')
export const getItemDetail = (id: string) => apiGet<ItemDetail>(`/api/items/${id}`)
export const postClick = (payload: any) => apiPost<{ ok: true }>('/api/metrics/click', payload)
