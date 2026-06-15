import { onUnmounted } from 'vue'

/** 路由切换 / 卸载 / 非法参数时忽略过期异步结果 */
export function useRequestGuard() {
  let seq = 0
  let disposed = false

  onUnmounted(() => {
    disposed = true
    invalidate()
  })

  function invalidate(): void {
    seq += 1
  }

  function begin(): number {
    seq += 1
    return seq
  }

  function isActive(id: number): boolean {
    return !disposed && id === seq
  }

  return { begin, isActive, invalidate }
}
