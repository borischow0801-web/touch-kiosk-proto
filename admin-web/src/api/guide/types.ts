export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface DeptMappingListItem {
  id: string
  deptName: string
  deptCode: string
  displayName: string
  icon: string | null
  floorText: string | null
  areaText: string | null
  isVisible: number
  sortOrder: number
  status: string
  createdAt: string
}

export interface CreateDeptMappingPayload {
  deptName: string
  deptCode: string
  displayName: string
  icon?: string
  floorText?: string
  areaText?: string
  isVisible?: number
  sortOrder?: number
}

export interface UpdateDeptMappingPayload {
  deptName?: string
  displayName?: string
  icon?: string | null
  floorText?: string | null
  areaText?: string | null
  isVisible?: number
  sortOrder?: number
  status?: 'active' | 'disabled'
}

export interface ThemeMappingListItem {
  id: string
  themeName: string
  themeCode: string
  platformParamJson: string | null
  icon: string | null
  isVisible: number
  sortOrder: number
  createdAt: string
}

export interface CreateThemeMappingPayload {
  themeName: string
  themeCode: string
  platformParamJson?: string
  icon?: string
  isVisible?: number
  sortOrder?: number
}

export interface UpdateThemeMappingPayload {
  themeName?: string
  platformParamJson?: string | null
  icon?: string | null
  isVisible?: number
  sortOrder?: number
}

export interface ItemConfigListItem {
  id: string
  platformItemId: string
  itemName: string
  displayName: string
  deptCode: string | null
  themeCode: string | null
  isHot: number
  isRecommend: number
  isVisible: number
  sortOrder: number
  relatedPolicyIds: string[]
  relatedFaqIds: string[]
  createdAt: string
}

export interface ItemConfigListQuery extends PageQuery {
  deptCode?: string
  themeCode?: string
  isHot?: 0 | 1
  isRecommend?: 0 | 1
  isVisible?: 0 | 1
}

export interface CreateItemConfigPayload {
  platformItemId: string
  itemName: string
  displayName: string
  deptCode?: string
  themeCode?: string
  isHot?: number
  isRecommend?: number
  isVisible?: number
  sortOrder?: number
  relatedPolicyIds?: string[]
  relatedFaqIds?: string[]
}

export interface UpdateItemConfigPayload {
  itemName?: string
  displayName?: string
  deptCode?: string | null
  themeCode?: string | null
  isHot?: number
  isRecommend?: number
  isVisible?: number
  sortOrder?: number
  relatedPolicyIds?: string[]
  relatedFaqIds?: string[]
}
