import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'

describe('首页配置权限', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('无 home read 权限时不显示首页菜单', () => {
    const auth = useAuthStore()
    auth.permissions = ['content:item:read']
    const perm = usePermission()
    expect(perm.showHomeMenu.value).toBe(false)
  })

  it('有 home:config:read 时显示菜单', () => {
    const auth = useAuthStore()
    auth.permissions = ['home:config:read']
    const perm = usePermission()
    expect(perm.showHomeMenu.value).toBe(true)
    expect(perm.canReadHomeConfig.value).toBe(true)
    expect(perm.canUpdateHomeConfig.value).toBe(false)
  })

  it('模块与配置权限独立控制', () => {
    const auth = useAuthStore()
    auth.permissions = ['home:config:read', 'home:module:create', 'home:module:sort']
    const perm = usePermission()
    expect(perm.canCreateHomeModule.value).toBe(true)
    expect(perm.canSortHomeModule.value).toBe(true)
    expect(perm.canDeleteHomeModule.value).toBe(false)
  })

  it('SUPER_ADMIN 拥有全部首页权限', () => {
    const auth = useAuthStore()
    auth.roles = ['SUPER_ADMIN']
    const perm = usePermission()
    expect(perm.canUpdateHomeConfig.value).toBe(true)
    expect(perm.canDeleteHomeModule.value).toBe(true)
  })
})
