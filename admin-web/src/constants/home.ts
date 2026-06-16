export const HOME_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待审核',
  published: '已发布',
  rejected: '已驳回',
  withdrawn: '已撤回',
  archived: '已归档',
}

export const HOME_MODULE_TYPE_OPTIONS = [
  { label: '卡片', value: 'card' },
  { label: '列表', value: 'list' },
  { label: '横幅', value: 'banner' },
]

export const HOME_TARGET_TYPE_OPTIONS = [
  { label: '路由', value: 'route' },
  { label: '内容', value: 'content' },
  { label: '外链', value: 'external' },
]
