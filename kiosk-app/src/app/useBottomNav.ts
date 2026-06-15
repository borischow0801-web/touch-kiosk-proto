import { useRouter } from 'vue-router'
import { useGuideStore } from '../stores/guide'
import { useContentStore } from '../stores/content'

/** 首页 / 重来 / 超时：清理办事指南与政务公开临时状态 */
export function resetKioskSession(): void {
  const guideStore = useGuideStore()
  const contentStore = useContentStore()
  guideStore.$reset()
  contentStore.reset()
}

export function useBottomNavActions() {
  const router = useRouter()

  async function goNav(to: string): Promise<void> {
    if (to === 'BACK') {
      await router.back()
      return
    }
    if (to === '/home') {
      resetKioskSession()
      await router.push('/home')
      return
    }
    await router.push(to)
  }

  return { goNav, resetKioskSession }
}
