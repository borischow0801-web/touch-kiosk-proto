import { adminGet, adminPost } from '@/api/http'
import type {
  PublishActionPayload,
  PublishActionResult,
  PublishRecordItem,
  RollbackPayload,
} from './types'

const BIZ_TYPE = 'content'

function publishUrl(bizId: string, action: string): string {
  return `/publish/${BIZ_TYPE}/${bizId}/${action}`
}

export function submitContentPublishApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'submit'), payload ?? {})
}

export function approveContentPublishApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'approve'), payload ?? {})
}

export function rejectContentPublishApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'reject'), payload ?? {})
}

export function directPublishContentApi(
  bizId: string,
  payload?: PublishActionPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'direct-publish'), payload ?? {})
}

export function withdrawContentPublishApi(
  bizId: string,
  payload?: Pick<PublishActionPayload, 'comment'>,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'withdraw'), payload ?? {})
}

export function rollbackContentPublishApi(
  bizId: string,
  payload: RollbackPayload,
): Promise<PublishActionResult> {
  return adminPost(publishUrl(bizId, 'rollback'), payload)
}

export function fetchContentPublishRecordsApi(bizId: string): Promise<PublishRecordItem[]> {
  return adminGet(publishUrl(bizId, 'records'))
}
