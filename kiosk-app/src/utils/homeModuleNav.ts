import type { Router } from 'vue-router'
import type { PublicHomeModule } from '../api/types'

/** 根据模块 targetType / targetValue 执行首页模块跳转 */
export async function navigateHomeModule(router: Router, mod: PublicHomeModule): Promise<void> {
  switch (mod.targetType) {
    case 'route':
      if (mod.targetValue.startsWith('/')) {
        await router.push(mod.targetValue)
      }
      break
    case 'content':
      await router.push(`/content/${encodeURIComponent(mod.targetValue)}`)
      break
    case 'external':
      break
    default:
      break
  }
}
