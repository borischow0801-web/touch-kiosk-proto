import type { Router } from 'vue-router'

export function useIdleHome(
  router: Router,
  getIdleSeconds: () => number,
  onReset?: () => void,
): () => void {
  let last = Date.now()
  let timerId: ReturnType<typeof window.setTimeout> | undefined

  const touch = () => { last = Date.now() }
  const events = ['click', 'touchstart', 'touchmove', 'scroll', 'keydown']
  events.forEach((e) => window.addEventListener(e, touch, { passive: true }))

  const loop = () => {
    const idleMs = getIdleSeconds() * 1000
    if (Date.now() - last > idleMs) {
      last = Date.now()
      if (router.currentRoute.value.path !== '/home') {
        onReset?.()
        void router.push('/home')
      }
    }
    timerId = window.setTimeout(loop, 1000)
  }

  loop()

  return function cleanup() {
    events.forEach((e) => window.removeEventListener(e, touch))
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      timerId = undefined
    }
  }
}
