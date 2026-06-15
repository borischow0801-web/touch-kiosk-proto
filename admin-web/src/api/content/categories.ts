import { ApiError } from '@/api/http'
import { adminDelete, adminGet, adminPost, adminPut } from '@/api/http'
import type {
  CategoryListItem,
  CategoryListQuery,
  CreateCategoryPayload,
  PageResult,
  UpdateCategoryPayload,
} from './types'

/** 单页最大条数（与后端 QueryPageDto 上限一致） */
export const CATEGORY_PAGE_SIZE = 100

/** 最多拉取页数，防止无限循环（上限 2000 条） */
export const MAX_CATEGORY_PAGES = 20

function toQueryParams(query: CategoryListQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (query.page != null) params.page = query.page
  if (query.pageSize != null) params.pageSize = query.pageSize
  if (query.contentType) params.contentType = query.contentType
  if (query.parentId !== undefined) params.parentId = query.parentId
  return params
}

export function fetchCategoriesApi(
  query: CategoryListQuery = {},
): Promise<PageResult<CategoryListItem>> {
  return adminGet<PageResult<CategoryListItem>>('/content/categories', {
    params: toQueryParams(query),
  })
}

/** 分页拉取全部分类，超过上限时抛出明确错误 */
export async function fetchAllCategoriesApi(
  query: Omit<CategoryListQuery, 'page' | 'pageSize'> = {},
): Promise<CategoryListItem[]> {
  const all: CategoryListItem[] = []
  let page = 1

  while (page <= MAX_CATEGORY_PAGES) {
    const res = await fetchCategoriesApi({
      ...query,
      page,
      pageSize: CATEGORY_PAGE_SIZE,
    })
    all.push(...res.list)
    if (res.list.length === 0 || all.length >= res.total) {
      return all
    }
    page += 1
  }

  throw new ApiError(
    `分类数量超过加载上限（${MAX_CATEGORY_PAGES * CATEGORY_PAGE_SIZE} 条），请联系管理员`,
    500,
  )
}

export function createCategoryApi(payload: CreateCategoryPayload): Promise<CategoryListItem> {
  return adminPost<CategoryListItem>('/content/categories', payload)
}

export function updateCategoryApi(
  id: string,
  payload: UpdateCategoryPayload,
): Promise<CategoryListItem> {
  return adminPut<CategoryListItem>(`/content/categories/${id}`, payload)
}

export function deleteCategoryApi(id: string): Promise<void> {
  return adminDelete<void>(`/content/categories/${id}`)
}
