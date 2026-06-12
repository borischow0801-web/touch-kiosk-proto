import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useContentStore } from '../src/stores/content'

describe('content store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('重来/回首页时 reset 清理页码与详情状态', () => {
    const store = useContentStore()
    store.rememberList('policies', 3)
    store.rememberDetail('policies', 'item-001')
    store.reset()
    expect(store.listType).toBe('')
    expect(store.page).toBe(1)
    expect(store.detailId).toBe('')
  })
})
