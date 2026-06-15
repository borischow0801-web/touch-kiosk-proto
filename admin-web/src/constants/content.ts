/** 与 backend/src/content/constants/content-types.ts 一致 */
export const CONTENT_TYPES = [
  'policy_file',
  'policy_interpretation',
  'open_guide',
  'open_system',
  'open_catalog',
  'annual_report',
  'organization',
  'faq',
  'notice',
] as const

export type ContentType = (typeof CONTENT_TYPES)[number]

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  policy_file: '政策文件',
  policy_interpretation: '政策解读',
  open_guide: '公开指南',
  open_system: '公开制度',
  open_catalog: '公开目录',
  annual_report: '年度报告',
  organization: '机构职能',
  faq: '常见问题',
  notice: '通知公告',
}

export const ITEM_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
  withdrawn: '已撤回',
  archived: '已归档',
}

export const CATEGORY_STATUS_LABELS: Record<string, string> = {
  active: '启用',
  disabled: '禁用',
}

export const FORBIDDEN_ITEM_WRITE_FIELDS = [
  'status',
  'currentVersionId',
  'publishAt',
] as const
