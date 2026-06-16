import type { PublishActionType } from '@/constants/publish'
import type { AdminHomeConfig } from '@/api/home/types'
import { configHasPendingReview } from './homeForm'

export function listHomePublishActions(
  config: AdminHomeConfig,
  records: Array<{ action: string; toStatus: string }>,
): PublishActionType[] {
  const status = config.status ?? 'draft'
  const hasDraft = Boolean(config.draftVersion)
  const hasPending = configHasPendingReview(config, records)
  const hasCurrent = Boolean(config.currentVersionId)

  const actions: PublishActionType[] = []

  if (hasPending) {
    actions.push('approve', 'reject')
  } else if (status === 'draft' && hasDraft) {
    actions.push('submit', 'directPublish')
  } else if ((status === 'withdrawn' || status === 'rejected') && hasDraft) {
    actions.push('submit', 'directPublish')
  } else if (status === 'published' && hasDraft) {
    actions.push('submit', 'directPublish')
  }

  if (status === 'published' && hasCurrent) {
    actions.push('withdraw')
  }

  actions.push('records')
  return [...new Set(actions)]
}

export function canHomeRollback(config: AdminHomeConfig): boolean {
  return config.status === 'published' && Boolean(config.currentVersionId)
}
