/** GET /api/admin/home/config 响应 */
export interface HomeVersionSummary {
  id: string
  versionNo: number
  title: string
  subtitle: string | null
  status: string
}

export interface HomeDraftVersionDetail extends HomeVersionSummary {
  topBannerJson: unknown
  themeJson: unknown
  changeRemark: string | null
}

export interface AdminHomeConfig {
  id: string | null
  configName: string
  status: string | null
  currentVersionId: string | null
  currentVersion: HomeVersionSummary | null
  draftVersion: HomeDraftVersionDetail | null
  updatedAt: string | null
}

/** PUT /api/admin/home/config 请求体 */
export interface UpdateHomeConfigPayload {
  title: string
  subtitle?: string
  topBannerJson?: unknown
  themeJson?: unknown
  changeRemark?: string
}

/** 模块列表项 */
export interface HomeModuleItem {
  id: string
  moduleCode: string
  moduleName: string
  moduleType: string
  icon: string | null
  color: string | null
  layoutType: string | null
  isVisible: boolean
  sortOrder: number
  targetType: string
  targetValue: string
}

export interface HomeModuleListResponse {
  list: HomeModuleItem[]
}

/** POST /api/admin/home/modules */
export interface CreateHomeModulePayload {
  moduleCode: string
  moduleName: string
  moduleType: string
  icon?: string
  color?: string
  layoutType?: string
  isVisible?: boolean
  sortOrder?: number
  targetType: string
  targetValue: string
}

/** PUT /api/admin/home/modules/:id — 部分更新 */
export type UpdateHomeModulePayload = Partial<CreateHomeModulePayload>

export interface SortHomeModulesPayload {
  items: Array<{ id: string; sortOrder: number }>
}
