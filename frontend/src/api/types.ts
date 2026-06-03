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
export type Dept = { id: string; name: string; firstLetter?: string; hot?: boolean }
export type Topic = { id: string; name: string; hot?: boolean }
export type Item = { id: string; name: string; deptId: string; topicId: string; hot?: boolean }
export type ItemDetail = Item & {
  materials: string[]
  steps: string[]
  locationText: string
  workTimeText: string
  tips?: string[]
}
