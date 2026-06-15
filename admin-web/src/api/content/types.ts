import type { ContentType } from '@/constants/content'

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface CategoryListItem {
  id: string
  parentId: string | null
  categoryName: string
  contentType: string
  sortOrder: number
  status: string
  createdAt: string
}

export interface CategoryListQuery {
  page?: number
  pageSize?: number
  contentType?: ContentType | ''
  parentId?: string
}

export interface CreateCategoryPayload {
  parentId?: string
  categoryName: string
  contentType: ContentType
  sortOrder?: number
}

export interface UpdateCategoryPayload {
  categoryName?: string
  sortOrder?: number
  status?: 'active' | 'disabled'
}

export interface ItemListItem {
  id: string
  contentType: string
  title: string
  subtitle: string | null
  summary: string | null
  categoryId: string | null
  currentVersionId: string | null
  status: string
  isTop: number
  isRecommend: number
  sortOrder: number
  createdAt: string
}

export interface ItemDetail extends ItemListItem {
  publishAt: string | null
  sourceType: string | null
  sourceUrl: string | null
  createdBy: string | null
  updatedBy: string | null
}

export interface ItemListQuery {
  page?: number
  pageSize?: number
  contentType?: ContentType | ''
  categoryId?: string
  status?: string
  title?: string
}

export interface CreateItemPayload {
  contentType: ContentType
  title: string
  subtitle?: string
  summary?: string
  body?: string
  extraJson?: string
  categoryId?: string
  changeRemark?: string
  sortOrder?: number
}

export interface UpdateItemPayload {
  title?: string
  subtitle?: string
  summary?: string
  body?: string
  extraJson?: string
  categoryId?: string
  changeRemark?: string
  sortOrder?: number
  isTop?: 0 | 1
  isRecommend?: 0 | 1
  sourceType?: string
  sourceUrl?: string
}

export interface VersionListItem {
  id: string
  contentId: string
  versionNo: number
  title: string
  summary: string | null
  status: string
  changeRemark: string | null
  createdBy: string | null
  createdAt: string
}

export interface VersionDetail extends VersionListItem {
  body: string | null
  extraJson: string | null
}
