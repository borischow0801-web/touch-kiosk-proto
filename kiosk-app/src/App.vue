<template>
  <div class="kiosk-app flex flex-col h-full">
    <KioskHomeHeader
      :title="config.title"
      :subtitle="config.subtitle"
      :banner-lines="config.bannerLines"
      :clock="nowText"
    />

    <div v-if="isOffline" class="offline-notice-bar">
      当前为离线首页配置，部分功能可能不可用
    </div>

    <main class="kiosk-main">
      <router-view />
    </main>

    <KioskBottomNav :items="config.nav" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KioskBottomNav from './components/KioskBottomNav.vue'
import KioskHomeHeader from './components/home/KioskHomeHeader.vue'
import { useIdleHome } from './app/useIdleHome'
import { resetKioskSession } from './app/useBottomNav'
import { useHomeConfigStore } from './stores/homeConfig'
import { applyThemeTokens } from './utils/applyTheme'

const homeConfig = useHomeConfigStore()
const config = computed(() => homeConfig.effectiveConfig)
const isOffline = computed(() => homeConfig.source === 'offline')

const nowText = ref('')
let clockTimer: ReturnType<typeof window.setInterval> | undefined
let cleanupIdle: (() => void) | undefined

const route = useRoute()
const router = useRouter()

watch(
  () => config.value.theme,
  (theme) => {
    applyThemeTokens(theme)
  },
  { immediate: true, deep: true },
)

watch(
  () => route.fullPath,
  () => {
    if (route.path === '/home' && String(route.query['reset'] ?? '') === '1') {
      resetKioskSession()
      void router.replace('/home')
    }
  },
  { immediate: true },
)

function tick() {
  const d = new Date()
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  nowText.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(async () => {
  tick()
  clockTimer = window.setInterval(tick, 30_000)
  await homeConfig.ensureLoaded()
  cleanupIdle = useIdleHome(
    router,
    () => config.value.idleSeconds,
    resetKioskSession,
  )
})

onUnmounted(() => {
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
  cleanupIdle?.()
})
</script>
