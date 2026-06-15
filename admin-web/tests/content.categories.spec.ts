import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '@/api/http'
import {
  CATEGORY_PAGE_SIZE,
  createCategoryApi,
  deleteCategoryApi,
  fetchAllCategoriesApi,
  fetchCategoriesApi,
  MAX_CATEGORY_PAGES,
  updateCategoryApi,
} from '@/api/content/categories'

describe('分类 API（axios-mock-adapter）', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  it('GET /content/categories 带 query 参数', async () => {
    mock.onGet('/content/categories', { params: { page: 1, pageSize: 20, contentType: 'faq' } }).reply(200, {
      code: 0,
      message: '成功',
      data: { list: [], total: 0, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'r1',
    })

    await fetchCategoriesApi({ page: 1, pageSize: 20, contentType: 'faq' })
    expect(mock.history.get).toHaveLength(1)
    expect(mock.history.get[0].params).toMatchObject({ contentType: 'faq' })
  })

  it('POST /content/categories 提交 CreateCategoryDto', async () => {
    mock.onPost('/content/categories').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body).toEqual({
        categoryName: '测试',
        contentType: 'faq',
        parentId: 'p1',
        sortOrder: 1,
      })
      return [200, {
        code: 0,
        message: '成功',
        data: {
          id: 'c1',
          parentId: 'p1',
          categoryName: '测试',
          contentType: 'faq',
          sortOrder: 1,
          status: 'active',
          createdAt: '2024-01-01',
        },
        timestamp: 1,
        requestId: 'r2',
      }]
    })

    const result = await createCategoryApi({
      categoryName: '测试',
      contentType: 'faq',
      parentId: 'p1',
      sortOrder: 1,
    })
    expect(result.id).toBe('c1')
  })

  it('PUT /content/categories/:id 不含 parentId', async () => {
    mock.onPut('/content/categories/c1').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body).toEqual({ categoryName: '新名', sortOrder: 2, status: 'disabled' })
      expect(body).not.toHaveProperty('parentId')
      return [200, {
        code: 0,
        message: '成功',
        data: {
          id: 'c1',
          parentId: null,
          categoryName: '新名',
          contentType: 'faq',
          sortOrder: 2,
          status: 'disabled',
          createdAt: '2024-01-01',
        },
        timestamp: 1,
        requestId: 'r3',
      }]
    })

    await updateCategoryApi('c1', { categoryName: '新名', sortOrder: 2, status: 'disabled' })
  })

  it('DELETE 409 返回后端文案', async () => {
    mock.onDelete('/content/categories/c1').reply(409, {
      code: 409,
      message: '该分类下仍有子分类，不允许删除',
      data: null,
      timestamp: 1,
      requestId: 'r4',
    })

    await expect(deleteCategoryApi('c1')).rejects.toMatchObject({
      message: '该分类下仍有子分类，不允许删除',
      code: 409,
    })
  })

  it('fetchAllCategoriesApi 分页拉取直至 total', async () => {
    const page1 = Array.from({ length: CATEGORY_PAGE_SIZE }, (_, i) => ({
      id: `c-${i}`,
      parentId: null,
      categoryName: `分类${i}`,
      contentType: 'faq',
      sortOrder: 0,
      status: 'active',
      createdAt: '2024-01-01',
    }))
    const page2 = [{ id: 'c-last', parentId: null, categoryName: '末条', contentType: 'faq', sortOrder: 0, status: 'active', createdAt: '2024-01-01' }]

    mock.onGet('/content/categories').reply((config) => {
      const page = Number(config.params?.page ?? 1)
      if (page === 1) {
        return [200, { code: 0, message: '成功', data: { list: page1, total: CATEGORY_PAGE_SIZE + 1, page: 1, pageSize: CATEGORY_PAGE_SIZE }, timestamp: 1, requestId: 'p1' }]
      }
      return [200, { code: 0, message: '成功', data: { list: page2, total: CATEGORY_PAGE_SIZE + 1, page: 2, pageSize: CATEGORY_PAGE_SIZE }, timestamp: 1, requestId: 'p2' }]
    })

    const all = await fetchAllCategoriesApi()
    expect(all).toHaveLength(CATEGORY_PAGE_SIZE + 1)
    expect(mock.history.get).toHaveLength(2)
  })

  it('fetchAllCategoriesApi 超过页数上限抛错', async () => {
    mock.onGet('/content/categories').reply(200, {
      code: 0,
      message: '成功',
      data: {
        list: [{ id: 'x', parentId: null, categoryName: 'x', contentType: 'faq', sortOrder: 0, status: 'active', createdAt: '2024-01-01' }],
        total: MAX_CATEGORY_PAGES * CATEGORY_PAGE_SIZE + 999,
        page: 1,
        pageSize: CATEGORY_PAGE_SIZE,
      },
      timestamp: 1,
      requestId: 'overflow',
    })

    await expect(fetchAllCategoriesApi()).rejects.toMatchObject({ code: 500 })
    expect(mock.history.get.length).toBe(MAX_CATEGORY_PAGES)
  })
})
