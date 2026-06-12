export const SUPPORTED_BIZ_TYPES = new Set(['content'] as const);

export type SupportedBizType = 'content';

export const PUBLISH_ACTIONS = {
  SUBMIT: 'submit',
  APPROVE: 'approve',
  REJECT: 'reject',
  DIRECT_PUBLISH: 'direct_publish',
  WITHDRAW: 'withdraw',
  ROLLBACK: 'rollback',
} as const;

export const VERSION_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;
