import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '@/api/http'
import { fetchItemVersionsApi, fetchVersionApi } from '@/api/content/items'

describe('版本 API（axios-mock-adapter，只读）', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  it('GET /content/items/:id/versions', async () => {
    mock.onGet('/content/items/i1/versions').reply(200, {
      code: 0,
      message: '成功',
      data: [
        {
          id: 'v1',
          contentId: 'i1',
          versionNo: 1,
          title: '标题',
          summary: null,
          status: 'draft',
          changeRemark: '初始版本',
          createdBy: 'u1',
          createdAt: '2024-01-01',
        },
      ],
      timestamp: 1,
      requestId: 'r1',
    })

    const list = await fetchItemVersionsApi('i1')
    expect(mock.history.get[0].url).toBe('/content/items/i1/versions')
    expect(list).toHaveLength(1)
  })

  it('GET /content/versions/:versionId 含 body', async () => {
    mock.onGet('/content/versions/v1').reply(200, {
      code: 0,
      message: '成功',
      data: {
        id: 'v1',
        contentId: 'i1',
        versionNo: 1,
        title: '标题',
        summary: '摘要',
        status: 'draft',
        changeRemark: null,
        createdBy: 'u1',
        createdAt: '2024-01-01',
        body: '正文内容',
        extraJson: null,
      },
      timestamp: 1,
      requestId: 'r2',
    })

    const detail = await fetchVersionApi('v1')
    expect(detail.body).toBe('正文内容')
  })
})
