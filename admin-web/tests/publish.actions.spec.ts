import { describe, expect, it } from 'vitest'
import {
  canRollbackVersion,
  canShowListPublishAction,
  canShowVersionPublishAction,
  getLatestDraftVersionNo,
  getVersionWorkflowWarning,
  listPublishActionsForStatus,
  MULTIPLE_PENDING_WARNING,
  publishActionCommentRequired,
  versionPublishActionsForRow,
} from '@/utils/publishActions'

describe('列表发布操作状态矩阵', () => {
  it('draft 显示提交与直接发布，不显示审核与撤回', () => {
    expect(canShowListPublishAction('submit', 'draft')).toBe(true)
    expect(canShowListPublishAction('directPublish', 'draft')).toBe(true)
    expect(canShowListPublishAction('approve', 'draft')).toBe(false)
    expect(canShowListPublishAction('reject', 'draft')).toBe(false)
    expect(canShowListPublishAction('withdraw', 'draft')).toBe(false)
  })

  it('pending 显示审核通过/驳回，不显示提交', () => {
    expect(canShowListPublishAction('approve', 'pending')).toBe(true)
    expect(canShowListPublishAction('reject', 'pending')).toBe(true)
    expect(canShowListPublishAction('submit', 'pending')).toBe(false)
    expect(canShowListPublishAction('directPublish', 'pending')).toBe(false)
  })

  it('published 仅显示撤回，不显示提交/审核/直接发布', () => {
    expect(canShowListPublishAction('withdraw', 'published')).toBe(true)
    expect(canShowListPublishAction('approve', 'published')).toBe(false)
    expect(canShowListPublishAction('reject', 'published')).toBe(false)
    expect(canShowListPublishAction('submit', 'published')).toBe(false)
    expect(canShowListPublishAction('directPublish', 'published')).toBe(false)
  })

  it('rejected 不显示提交或直接发布，仅可有发布记录', () => {
    expect(canShowListPublishAction('submit', 'rejected')).toBe(false)
    expect(canShowListPublishAction('directPublish', 'rejected')).toBe(false)
    expect(canShowListPublishAction('approve', 'rejected')).toBe(false)
    expect(canShowListPublishAction('records', 'rejected')).toBe(true)
    const actions = listPublishActionsForStatus('rejected')
    expect(actions).toEqual(['records'])
  })

  it('withdrawn 不显示提交或直接发布', () => {
    expect(canShowListPublishAction('submit', 'withdrawn')).toBe(false)
    expect(canShowListPublishAction('directPublish', 'withdrawn')).toBe(false)
    expect(canShowListPublishAction('withdraw', 'withdrawn')).toBe(false)
  })

  it('archived 不显示任何发布操作（除记录）', () => {
    const actions = listPublishActionsForStatus('archived').filter((a) => a !== 'records')
    expect(actions).toHaveLength(0)
  })

  it('发布记录任意状态可见', () => {
    expect(canShowListPublishAction('records', 'draft')).toBe(true)
    expect(canShowListPublishAction('records', 'rejected')).toBe(true)
    expect(canShowListPublishAction('records', 'archived')).toBe(true)
  })
})

describe('版本发布操作矩阵', () => {
  const noPendingVersions = [
    { id: 'v1', versionNo: 1, status: 'published' },
    { id: 'v2', versionNo: 2, status: 'draft' },
    { id: 'v3', versionNo: 3, status: 'draft' },
  ]

  const draftAndPendingVersions = [
    { id: 'v1', versionNo: 1, status: 'published' },
    { id: 'v2', versionNo: 2, status: 'draft' },
    { id: 'v3', versionNo: 3, status: 'draft' },
    { id: 'v4', versionNo: 4, status: 'pending' },
  ]

  const multiplePendingVersions = [
    { id: 'v1', versionNo: 1, status: 'pending' },
    { id: 'v2', versionNo: 2, status: 'pending' },
  ]

  it('getLatestDraftVersionNo 取最大 draft 版本号', () => {
    expect(getLatestDraftVersionNo(noPendingVersions)).toBe(3)
  })

  it('无 pending 时最新 draft 显示提交与直接发布', () => {
    const latest = noPendingVersions[2]
    expect(canShowVersionPublishAction('submit', latest, noPendingVersions)).toBe(true)
    expect(canShowVersionPublishAction('directPublish', latest, noPendingVersions)).toBe(true)
  })

  it('非最新 draft 不显示提交或直接发布', () => {
    const older = noPendingVersions[1]
    expect(canShowVersionPublishAction('submit', older, noPendingVersions)).toBe(false)
    expect(canShowVersionPublishAction('directPublish', older, noPendingVersions)).toBe(false)
  })

  it('存在 pending 时所有 draft 不显示提交和直接发布', () => {
    const latestDraft = draftAndPendingVersions[2]
    const olderDraft = draftAndPendingVersions[1]
    expect(canShowVersionPublishAction('submit', latestDraft, draftAndPendingVersions)).toBe(false)
    expect(canShowVersionPublishAction('directPublish', latestDraft, draftAndPendingVersions)).toBe(false)
    expect(canShowVersionPublishAction('submit', olderDraft, draftAndPendingVersions)).toBe(false)
  })

  it('单个 pending 显示审核通过与驳回', () => {
    const pending = draftAndPendingVersions[3]
    expect(canShowVersionPublishAction('approve', pending, draftAndPendingVersions)).toBe(true)
    expect(canShowVersionPublishAction('reject', pending, draftAndPendingVersions)).toBe(true)
    expect(versionPublishActionsForRow(pending, draftAndPendingVersions)).toContain('approve')
  })

  it('多个 pending 不显示审核按钮并返回异常提示', () => {
    const p1 = multiplePendingVersions[0]
    const p2 = multiplePendingVersions[1]
    expect(canShowVersionPublishAction('approve', p1, multiplePendingVersions)).toBe(false)
    expect(canShowVersionPublishAction('reject', p2, multiplePendingVersions)).toBe(false)
    expect(getVersionWorkflowWarning(multiplePendingVersions)).toBe(MULTIPLE_PENDING_WARNING)
  })

  it('published 版本可回滚，不可提交', () => {
    const published = noPendingVersions[0]
    expect(canShowVersionPublishAction('rollback', published, noPendingVersions)).toBe(true)
    expect(canShowVersionPublishAction('submit', published, noPendingVersions)).toBe(false)
  })

  it('驳回必须填写意见', () => {
    expect(publishActionCommentRequired('reject')).toBe(true)
    expect(publishActionCommentRequired('submit')).toBe(false)
  })

  it('仅 published/withdrawn 版本可回滚', () => {
    expect(canRollbackVersion('published')).toBe(true)
    expect(canRollbackVersion('withdrawn')).toBe(true)
    expect(canRollbackVersion('draft')).toBe(false)
    expect(canRollbackVersion('pending')).toBe(false)
  })
})
