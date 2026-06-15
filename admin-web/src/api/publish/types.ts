/** 与 backend PublishActionResult 一致 */
export interface PublishActionResult {
  bizId: string
  bizType: string
  itemStatus: string
  versionId: string
  versionStatus: string
  versionNo: number
  currentVersionId: string | null
  publishAt: string | null
}

/** 与 backend PublishRecordItem 一致 */
export interface PublishRecordItem {
  id: string
  bizType: string
  bizId: string
  versionId: string
  action: string
  fromStatus: string
  toStatus: string
  comment: string | null
  operatorId: string
  operatedAt: string
}

/** PublishActionDto / PublishCommentDto */
export interface PublishActionPayload {
  versionId?: string
  comment?: string
}

/** RollbackDto */
export interface RollbackPayload {
  versionId: string
  comment?: string
}
