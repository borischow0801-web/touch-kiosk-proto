import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '@/api/http'
import {
  createItemApi,
  deleteItemApi,
  fetchItemsApi,
  updateItemApi,
} from '@/api/content/items'

describe('内容 API（axios-mock-adapter）', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  it('GET /content/items 传递分页与筛选 query', async () => {
    mock.onGet('/content/items').reply((config) => {
      expect(config.params).toMatchObject({
        page: 2,
        pageSize: 10,
        title: '政策',
        contentType: 'policy_file',
        status: 'draft',
        categoryId: 'cat-1',
      })
      return [200, {
        code: 0,
        message: '成功',
        data: { list: [], total: 0, page: 2, pageSize: 10 },
        timestamp: 1,
        requestId: 'r1',
      }]
    })

    await fetchItemsApi({
      page: 2,
      pageSize: 10,
      title: '政策',
      contentType: 'policy_file',
      status: 'draft',
      categoryId: 'cat-1',
    })
  })

  it('POST /content/items 仅含 CreateItemDto 字段', async () => {
    mock.onPost('/content/items').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body).toEqual({ contentType: 'notice', title: '公告', body: '正文' })
      expect(body).not.toHaveProperty('status')
      expect(body).not.toHaveProperty('currentVersionId')
      return [200, {
        code: 0,
        message: '成功',
        data: {
          id: 'i1',
          contentType: 'notice',
          title: '公告',
          subtitle: null,
          summary: null,
          categoryId: null,
          currentVersionId: 'v1',
          status: 'draft',
          isTop: 0,
          isRecommend: 0,
          sortOrder: 0,
          createdAt: '2024-01-01',
          publishAt: null,
          sourceType: null,
          sourceUrl: null,
          createdBy: 'u1',
          updatedBy: 'u1',
        },
        timestamp: 1,
        requestId: 'r2',
      }]
    })

    await createItemApi({ contentType: 'notice', title: '公告', body: '正文' })
  })

  it('PUT /content/items/:id 可提交空字符串清空字段', async () => {
    mock.onPut('/content/items/i1').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body).toEqual({ categoryId: '', body: '', subtitle: '' })
      return [200, {
        code: 0,
        message: '成功',
        data: {
          id: 'i1',
          contentType: 'notice',
          title: '公告',
          subtitle: null,
          summary: null,
          categoryId: null,
          currentVersionId: 'v1',
          status: 'draft',
          isTop: 0,
          isRecommend: 0,
          sortOrder: 0,
          createdAt: '2024-01-01',
          publishAt: null,
          sourceType: null,
          sourceUrl: null,
          createdBy: 'u1',
          updatedBy: 'u1',
        },
        timestamp: 1,
        requestId: 'r3',
      }]
    })

    await updateItemApi('i1', { categoryId: '', body: '', subtitle: '' })
  })

  it('DELETE /content/items/:id', async () => {
    mock.onDelete('/content/items/item-1').reply(200, {
      code: 0,
      message: '成功',
      data: null,
      timestamp: 1,
      requestId: 'r4',
    })
    await deleteItemApi('item-1')
    expect(mock.history.delete[0].url).toBe('/content/items/item-1')
  })
})
