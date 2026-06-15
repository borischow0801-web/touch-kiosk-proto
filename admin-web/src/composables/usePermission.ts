import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

export function usePermission() {
  const auth = useAuthStore()

  const canReadCategory = computed(() => auth.hasPermission('content:category:read'))
  const canCreateCategory = computed(() => auth.hasPermission('content:category:create'))
  const canUpdateCategory = computed(() => auth.hasPermission('content:category:update'))
  const canDeleteCategory = computed(() => auth.hasPermission('content:category:delete'))

  const canReadItem = computed(() => auth.hasPermission('content:item:read'))
  const canCreateItem = computed(() => auth.hasPermission('content:item:create'))
  const canUpdateItem = computed(() => auth.hasPermission('content:item:update'))
  const canDeleteItem = computed(() => auth.hasPermission('content:item:delete'))
  const canReadVersion = computed(() => auth.hasPermission('content:version:read'))

  const canPublishSubmit = computed(() => auth.hasPermission('publish:submit'))
  const canPublishApprove = computed(() => auth.hasPermission('publish:approve'))
  const canPublishReject = computed(() => auth.hasPermission('publish:reject'))
  const canPublishDirect = computed(() => auth.hasPermission('publish:direct-publish'))
  const canPublishWithdraw = computed(() => auth.hasPermission('publish:withdraw'))
  const canPublishRollback = computed(() => auth.hasPermission('publish:rollback'))
  const canReadPublishRecords = computed(() => auth.hasPermission('publish:record:read'))

  const showContentMenu = computed(
    () => canReadCategory.value || canReadItem.value,
  )

  const canReadDept = computed(() => auth.hasPermission('guide:dept:read'))
  const canCreateDept = computed(() => auth.hasPermission('guide:dept:create'))
  const canUpdateDept = computed(() => auth.hasPermission('guide:dept:update'))
  const canDeleteDept = computed(() => auth.hasPermission('guide:dept:delete'))

  const canReadTheme = computed(() => auth.hasPermission('guide:theme:read'))
  const canCreateTheme = computed(() => auth.hasPermission('guide:theme:create'))
  const canUpdateTheme = computed(() => auth.hasPermission('guide:theme:update'))
  const canDeleteTheme = computed(() => auth.hasPermission('guide:theme:delete'))

  const canReadGuideItem = computed(() => auth.hasPermission('guide:item:read'))
  const canCreateGuideItem = computed(() => auth.hasPermission('guide:item:create'))
  const canUpdateGuideItem = computed(() => auth.hasPermission('guide:item:update'))
  const canDeleteGuideItem = computed(() => auth.hasPermission('guide:item:delete'))

  const showGuideMenu = computed(
    () => canReadDept.value || canReadTheme.value || canReadGuideItem.value,
  )

  function hasPermission(code: string): boolean {
    return auth.hasPermission(code)
  }

  function hasAnyPermission(codes: string[]): boolean {
    return codes.some((c) => auth.hasPermission(c))
  }

  return {
    canReadCategory,
    canCreateCategory,
    canUpdateCategory,
    canDeleteCategory,
    canReadItem,
    canCreateItem,
    canUpdateItem,
    canDeleteItem,
    canReadVersion,
    canPublishSubmit,
    canPublishApprove,
    canPublishReject,
    canPublishDirect,
    canPublishWithdraw,
    canPublishRollback,
    canReadPublishRecords,
    showContentMenu,
    canReadDept,
    canCreateDept,
    canUpdateDept,
    canDeleteDept,
    canReadTheme,
    canCreateTheme,
    canUpdateTheme,
    canDeleteTheme,
    canReadGuideItem,
    canCreateGuideItem,
    canUpdateGuideItem,
    canDeleteGuideItem,
    showGuideMenu,
    hasPermission,
    hasAnyPermission,
  }
}
