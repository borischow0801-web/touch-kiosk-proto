import { ITEM_STATUS_LABELS } from '@/constants/content'

/** 与 backend PUBLISH_ACTIONS 一致 */
export const PUBLISH_ACTIONS = {
  SUBMIT: 'submit',
  APPROVE: 'approve',
  REJECT: 'reject',
  DIRECT_PUBLISH: 'direct_publish',
  WITHDRAW: 'withdraw',
  ROLLBACK: 'rollback',
} as const

export type PublishActionType =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'directPublish'
  | 'withdraw'
  | 'records'

export const PUBLISH_PERMISSIONS: Record<PublishActionType, string> = {
  submit: 'publish:submit',
  approve: 'publish:approve',
  reject: 'publish:reject',
  directPublish: 'publish:direct-publish',
  withdraw: 'publish:withdraw',
  records: 'publish:record:read',
}

export const PUBLISH_ROLLBACK_PERMISSION = 'publish:rollback'

export const PUBLISH_ACTION_LABELS: Record<PublishActionType, string> = {
  submit: '提交审核',
  approve: '审核通过',
  reject: '审核驳回',
  directPublish: '直接发布',
  withdraw: '撤回',
  records: '发布记录',
}

export const PUBLISH_RECORD_ACTION_LABELS: Record<string, string> = {
  submit: '提交审核',
  approve: '审核通过',
  reject: '审核驳回',
  direct_publish: '直接发布',
  withdraw: '撤回',
  rollback: '版本回滚',
}

export function publishStatusLabel(status: string): string {
  return ITEM_STATUS_LABELS[status] || status
}

export const PUBLISH_CONFIRM_MESSAGES: Record<
  Exclude<PublishActionType, 'records'>,
  string
> = {
  submit: '确定将当前最新草稿提交审核？',
  approve: '确定审核通过并发布该版本？',
  reject: '确定驳回该待审核版本？',
  directPublish: '确定跳过审核直接发布？',
  withdraw: '确定撤回已发布内容？撤回后群众端将不再展示。',
}
