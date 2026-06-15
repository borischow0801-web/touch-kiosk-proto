import type { PublishActionType } from '@/constants/publish'

export type VersionPublishActionType = 'submit' | 'approve' | 'reject' | 'directPublish' | 'rollback'

export interface VersionRowForPublish {
  id: string
  versionNo: number
  status: string
}

/** 存在多个 pending 版本时的页面提示（与后端 409 文案一致） */
export const MULTIPLE_PENDING_WARNING =
  '存在多个待审核版本，数据异常，无法审核。请联系管理员处理。'

/**
 * 列表页按钮可见性：仅依据 item.status 能确定的操作，不依赖版本工作流。
 */
export function canShowListPublishAction(action: PublishActionType, itemStatus: string): boolean {
  if (action === 'records') return true
  switch (itemStatus) {
    case 'draft':
      return action === 'submit' || action === 'directPublish'
    case 'pending':
      return action === 'approve' || action === 'reject'
    case 'published':
      return action === 'withdraw'
    case 'rejected':
      // 主表 rejected 不能证明已生成新 draft，提交/直接发布须在版本页操作
      return false
    case 'withdrawn':
    case 'archived':
      return false
    default:
      return false
  }
}

/** @deprecated 使用 canShowListPublishAction */
export function canShowPublishAction(action: PublishActionType, itemStatus: string): boolean {
  return canShowListPublishAction(action, itemStatus)
}

export function listPublishActionsForStatus(itemStatus: string): PublishActionType[] {
  const all: PublishActionType[] = [
    'submit',
    'approve',
    'reject',
    'directPublish',
    'withdraw',
    'records',
  ]
  return all.filter((a) => canShowListPublishAction(a, itemStatus))
}

export function countPendingVersions(versions: VersionRowForPublish[]): number {
  return versions.filter((v) => v.status === 'pending').length
}

export function hasPendingVersions(versions: VersionRowForPublish[]): boolean {
  return countPendingVersions(versions) > 0
}

export function hasMultiplePendingVersions(versions: VersionRowForPublish[]): boolean {
  return countPendingVersions(versions) > 1
}

/** 版本页数据异常提示；组件直接绑定展示，不在组件内重复判断 */
export function getVersionWorkflowWarning(versions: VersionRowForPublish[]): string | null {
  if (hasMultiplePendingVersions(versions)) return MULTIPLE_PENDING_WARNING
  return null
}

export function getLatestDraftVersionNo(versions: VersionRowForPublish[]): number | null {
  const drafts = versions.filter((v) => v.status === 'draft')
  if (drafts.length === 0) return null
  return Math.max(...drafts.map((v) => v.versionNo))
}

/**
 * 版本页：依据整组版本集合判断可执行操作。
 * - 有任意 pending 时，所有 draft 不显示提交/直接发布
 * - 仅 1 个 pending 时显示审核通过/驳回
 * - 多个 pending 视为异常，不显示审核按钮
 */
export function canShowVersionPublishAction(
  action: VersionPublishActionType,
  version: VersionRowForPublish,
  versions: VersionRowForPublish[],
): boolean {
  const latestDraftNo = getLatestDraftVersionNo(versions)
  const pendingCount = countPendingVersions(versions)

  switch (action) {
    case 'submit':
    case 'directPublish':
      return (
        pendingCount === 0
        && version.status === 'draft'
        && latestDraftNo !== null
        && version.versionNo === latestDraftNo
      )
    case 'approve':
    case 'reject':
      return pendingCount === 1 && version.status === 'pending'
    case 'rollback':
      return canRollbackVersion(version.status)
    default:
      return false
  }
}

export function versionPublishActionsForRow(
  version: VersionRowForPublish,
  versions: VersionRowForPublish[],
): VersionPublishActionType[] {
  const all: VersionPublishActionType[] = [
    'submit',
    'directPublish',
    'approve',
    'reject',
    'rollback',
  ]
  return all.filter((a) => canShowVersionPublishAction(a, version, versions))
}

/** 驳回必须填写意见；其余操作意见可选 */
export function publishActionCommentRequired(
  action: PublishActionType | VersionPublishActionType,
): boolean {
  return action === 'reject'
}

export function publishActionAllowsComment(
  action: PublishActionType | VersionPublishActionType,
): boolean {
  return ['submit', 'approve', 'reject', 'directPublish', 'withdraw'].includes(action)
}

/** 版本页：可对历史已发布/已撤回版本执行回滚 */
export function canRollbackVersion(versionStatus: string): boolean {
  return versionStatus === 'published' || versionStatus === 'withdrawn'
}
