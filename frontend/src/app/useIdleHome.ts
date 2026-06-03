import router from './router'
export function useIdleHome(getIdleSeconds: () => number) {
  let last = Date.now()
  const touch = () => { last = Date.now() }
  const events = ['click','touchstart','touchmove','scroll','keydown']
  events.forEach(e => window.addEventListener(e, touch, { passive: true }))
  const loop = () => {
    const idleMs = getIdleSeconds() * 1000
    if (Date.now() - last > idleMs) {
      if (router.currentRoute.value.path !== '/home') router.push('/home')
      last = Date.now()
    }
    window.setTimeout(loop, 1000)
  }
  loop()
}
