import { adminGet, adminPut } from '@/api/http'
import type { AdminHomeConfig, UpdateHomeConfigPayload } from './types'

export function fetchHomeConfigApi(): Promise<AdminHomeConfig> {
  return adminGet<AdminHomeConfig>('/home/config')
}

export function updateHomeConfigApi(payload: UpdateHomeConfigPayload): Promise<AdminHomeConfig> {
  return adminPut<AdminHomeConfig>('/home/config', payload)
}
