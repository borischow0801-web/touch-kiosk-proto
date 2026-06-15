import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'

describe('办事指南权限', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('无 guide read 权限时不显示办事指南菜单', () => {
    const auth = useAuthStore()
    auth.permissions = ['content:item:read']
    const perm = usePermission()
    expect(perm.showGuideMenu.value).toBe(false)
  })

  it('有 guide:dept:read 时显示菜单且仅有部门子项权限', () => {
    const auth = useAuthStore()
    auth.permissions = ['guide:dept:read']
    const perm = usePermission()
    expect(perm.showGuideMenu.value).toBe(true)
    expect(perm.canReadDept.value).toBe(true)
    expect(perm.canCreateDept.value).toBe(false)
    expect(perm.canReadTheme.value).toBe(false)
    expect(perm.canReadGuideItem.value).toBe(false)
  })

  it('创建、编辑、删除按钮权限分别控制', () => {
    const auth = useAuthStore()
    auth.permissions = [
      'guide:theme:read',
      'guide:theme:create',
      'guide:theme:update',
    ]
    const perm = usePermission()
    expect(perm.canReadTheme.value).toBe(true)
    expect(perm.canCreateTheme.value).toBe(true)
    expect(perm.canUpdateTheme.value).toBe(true)
    expect(perm.canDeleteTheme.value).toBe(false)
  })

  it('事项配置权限 guide:item:* 独立控制', () => {
    const auth = useAuthStore()
    auth.permissions = ['guide:item:read', 'guide:item:delete']
    const perm = usePermission()
    expect(perm.canReadGuideItem.value).toBe(true)
    expect(perm.canCreateGuideItem.value).toBe(false)
    expect(perm.canDeleteGuideItem.value).toBe(true)
    expect(perm.canCreateItem.value).toBe(false)
  })

  it('SUPER_ADMIN 拥有全部办事指南权限', () => {
    const auth = useAuthStore()
    auth.roles = ['SUPER_ADMIN']
    const perm = usePermission()
    expect(perm.canReadDept.value).toBe(true)
    expect(perm.canCreateTheme.value).toBe(true)
    expect(perm.canUpdateGuideItem.value).toBe(true)
    expect(perm.canDeleteGuideItem.value).toBe(true)
  })
})
