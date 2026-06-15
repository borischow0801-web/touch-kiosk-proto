import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '@/api/http'
import {
  approveContentPublishApi,
  directPublishContentApi,
  fetchContentPublishRecordsApi,
  rejectContentPublishApi,
  rollbackContentPublishApi,
  submitContentPublishApi,
  withdrawContentPublishApi,
} from '@/api/publish/content'

const BIZ_ID = 'item-001'
const RESULT = {
  bizId: BIZ_ID,
  bizType: 'content',
  itemStatus: 'pending',
  versionId: 'ver-001',
  versionStatus: 'pending',
  versionNo: 1,
  currentVersionId: null,
  publishAt: null,
}

describe('发布 API（axios-mock-adapter）', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  it('POST /publish/content/:id/submit', async () => {
    mock.onPost(`/publish/content/${BIZ_ID}/submit`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({ comment: '请审核' })
      return [200, { code: 0, message: '成功', data: RESULT, timestamp: 1, requestId: 's1' }]
    })
    await submitContentPublishApi(BIZ_ID, { comment: '请审核' })
  })

  it('POST /publish/content/:id/approve', async () => {
    mock.onPost(`/publish/content/${BIZ_ID}/approve`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({ comment: '通过' })
      return [200, {
        code: 0,
        message: '成功',
        data: { ...RESULT, itemStatus: 'published', versionStatus: 'published' },
        timestamp: 1,
        requestId: 'a1',
      }]
    })
    await approveContentPublishApi(BIZ_ID, { comment: '通过' })
  })

  it('POST /publish/content/:id/reject', async () => {
    mock.onPost(`/publish/content/${BIZ_ID}/reject`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({ comment: '不合规' })
      return [200, {
        code: 0,
        message: '成功',
        data: { ...RESULT, itemStatus: 'rejected', versionStatus: 'rejected' },
        timestamp: 1,
        requestId: 'r1',
      }]
    })
    await rejectContentPublishApi(BIZ_ID, { comment: '不合规' })
  })

  it('POST /publish/content/:id/direct-publish', async () => {
    mock.onPost(`/publish/content/${BIZ_ID}/direct-publish`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({})
      return [200, {
        code: 0,
        message: '成功',
        data: { ...RESULT, itemStatus: 'published', versionStatus: 'published' },
        timestamp: 1,
        requestId: 'd1',
      }]
    })
    await directPublishContentApi(BIZ_ID)
  })

  it('POST /publish/content/:id/withdraw', async () => {
    mock.onPost(`/publish/content/${BIZ_ID}/withdraw`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({ comment: '临时下线' })
      return [200, {
        code: 0,
        message: '成功',
        data: { ...RESULT, itemStatus: 'withdrawn', versionStatus: 'withdrawn' },
        timestamp: 1,
        requestId: 'w1',
      }]
    })
    await withdrawContentPublishApi(BIZ_ID, { comment: '临时下线' })
  })

  it('POST /publish/content/:id/rollback 携带 versionId', async () => {
    mock.onPost(`/publish/content/${BIZ_ID}/rollback`).reply((config) => {
      expect(JSON.parse(config.data as string)).toEqual({
        versionId: 'ver-old',
        comment: '回滚说明',
      })
      return [200, {
        code: 0,
        message: '成功',
        data: { ...RESULT, versionId: 'ver-new', versionStatus: 'draft', versionNo: 2 },
        timestamp: 1,
        requestId: 'rb1',
      }]
    })
    await rollbackContentPublishApi(BIZ_ID, { versionId: 'ver-old', comment: '回滚说明' })
  })

  it('GET /publish/content/:id/records', async () => {
    mock.onGet(`/publish/content/${BIZ_ID}/records`).reply(200, {
      code: 0,
      message: '成功',
      data: [{
        id: 'rec-1',
        bizType: 'content',
        bizId: BIZ_ID,
        versionId: 'ver-001',
        action: 'submit',
        fromStatus: 'draft',
        toStatus: 'pending',
        comment: null,
        operatorId: 'u1',
        operatedAt: '2024-06-01T00:00:00.000Z',
      }],
      timestamp: 1,
      requestId: 'rec',
    })
    const rows = await fetchContentPublishRecordsApi(BIZ_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('submit')
  })
})
