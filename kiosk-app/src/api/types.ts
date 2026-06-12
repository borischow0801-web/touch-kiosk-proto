export type NavItem = { label: string; to: string }
export type HotItem = { id: string; name: string }
export type AppConfig = {
  title: string
  subtitle?: string
  idleSeconds: number
  homeHotItems: HotItem[]
  nav: NavItem[]
  bannerLines?: string[]
}

export type Dept = { deptCode: string; name: string; firstLetter?: string; hot?: boolean }
export type Theme = { themeCode: string; name: string; hot?: boolean }
export type ItemType = { code: string; name: string }

export type Item = {
  itemId: string
  name: string
  deptCode: string
  themeCode: string
  itemTypeCode?: string
  hot?: boolean
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface ItemMaterial {
  name: string
  required: boolean
  note?: string
}
export interface ItemStep {
  step: number
  name: string
  description?: string
}
export interface ItemLocation {
  name: string
  address?: string
  floor?: string
  area?: string
}
export interface ItemBasicInfo {
  itemId: string
  name: string
  deptName: string
  themeNames: string[]
  summary?: string
}

export type PublicContentListItem = {
  id: string
  contentType: string
  title: string
  subtitle: string | null
  summary: string | null
  categoryId: string | null
  coverFileId: string | null
  publishAt: string | null
  sourceType: string | null
  sourceUrl: string | null
}

export type PublicContentDetail = PublicContentListItem & {
  body: string | null
}

export type ItemDetail = {
  basicInfo: ItemBasicInfo
  acceptConditions: string[]
  materials: ItemMaterial[]
  processSteps: ItemStep[]
  locations: ItemLocation[]
  workTime: string
  timeLimit: string
  fee: string
  legalBasis: string[]
  consultationPhone: string
  complaintPhone: string
  relatedPolicies: { id: string; title: string }[]
  relatedFaqs: { id: string; title: string }[]
}
