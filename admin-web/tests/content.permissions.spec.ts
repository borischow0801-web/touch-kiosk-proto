import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'

describe('内容权限', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('无分类 read 权限时 canReadCategory 为 false', () => {
    const auth = useAuthStore()
    auth.permissions = ['content:item:read']
    const perm = usePermission()
    expect(perm.canReadCategory.value).toBe(false)
    expect(perm.showContentMenu.value).toBe(true)
  })

  it('SUPER_ADMIN 拥有全部内容权限', () => {
    const auth = useAuthStore()
    auth.roles = ['SUPER_ADMIN']
    auth.permissions = []
    const perm = usePermission()
    expect(perm.canReadCategory.value).toBe(true)
    expect(perm.canCreateItem.value).toBe(true)
    expect(perm.canDeleteCategory.value).toBe(true)
    expect(perm.canReadVersion.value).toBe(true)
  })

  it('permissions 含 * 拥有全部内容权限', () => {
    const auth = useAuthStore()
    auth.permissions = ['*']
    const perm = usePermission()
    expect(perm.canUpdateItem.value).toBe(true)
    expect(perm.canDeleteItem.value).toBe(true)
  })

  it('精确权限码匹配', () => {
    const auth = useAuthStore()
    auth.permissions = ['content:category:read', 'content:item:read']
    const perm = usePermission()
    expect(perm.canReadCategory.value).toBe(true)
    expect(perm.canCreateCategory.value).toBe(false)
    expect(perm.canReadItem.value).toBe(true)
    expect(perm.canCreateItem.value).toBe(false)
  })

  it('无任何内容 read 权限时不显示内容菜单', () => {
    const auth = useAuthStore()
    auth.permissions = ['system:user:read']
    const perm = usePermission()
    expect(perm.showContentMenu.value).toBe(false)
  })

  it('发布权限分别控制对应能力', () => {
    const auth = useAuthStore()
    auth.permissions = ['publish:submit', 'publish:record:read']
    const perm = usePermission()
    expect(perm.canPublishSubmit.value).toBe(true)
    expect(perm.canPublishApprove.value).toBe(false)
    expect(perm.canPublishRollback.value).toBe(false)
    expect(perm.canReadPublishRecords.value).toBe(true)
  })
})
