import { adminGet, adminPost } from '@/api/http'
import type {
  PublishActionPayload,
  PublishActionResult,
  PublishRecordItem,
  RollbackPayload,
} from './types'

const BIZ_TYPE = 'home_config'

function publishUrl(bizId: string, action: string): string {
  return `/publish/${BIZ_TYPE}/${bizId}/${action}`
}

export function submitHomeConfigPublishApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'submit'), payload ?? {})
}

export function approveHomeConfigPublishApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'approve'), payload ?? {})
}

export function rejectHomeConfigPublishApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'reject'), payload ?? {})
}

export function directPublishHomeConfigApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'direct-publish'), payload ?? {})
}

export function withdrawHomeConfigPublishApi(
  bizId: string,
  payload?: Pick<PublishActionPayload, 'comment'>,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'withdraw'), payload ?? {})
}

export function rollbackHomeConfigPublishApi(
  bizId: string,
  payload: RollbackPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'rollback'), payload)
}

export function fetchHomeConfigPublishRecordsApi(bizId: string): Promise<PublishRecordItem[]> {
  return adminGet<PublishRecordItem[]>(publishUrl(bizId, 'records'))
}

export const HOME_CONFIG_BIZ_TYPE = BIZ_TYPE
