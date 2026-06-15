<template>
  <div class="h-full flex flex-col">
    <header class="shrink-0 px-6 py-5 bg-white shadow-sm" style="height: 29vh;">
      <div class="flex items-start justify-between h-full">
        <div>
          <div class="text-5xl font-bold text-slate-900">{{ config?.title ?? '触摸查询原型' }}</div>
          <div class="text-3xl text-slate-500 mt-3">{{ config?.subtitle ?? '请在下方操作区点击选择' }}</div>
          <div class="mt-4 space-y-2">
            <div v-for="(line, idx) in (config?.bannerLines ?? [])" :key="idx" class="text-3xl text-slate-700">
              {{ line }}
            </div>
          </div>
        </div>
        <div class="text-3xl text-slate-500">{{ nowText }}</div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto px-6 py-6" style="height: 68vh;">
      <router-view />
    </main>

    <KioskBottomNav :items="config?.nav ?? defaultNav" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KioskBottomNav from './components/KioskBottomNav.vue'
import { getConfig } from './api/endpoints'
import type { AppConfig, NavItem } from './api/types'
import { useIdleHome } from './app/useIdleHome'
import { resetKioskSession } from './app/useBottomNav'

const config = ref<AppConfig | null>(null)
const defaultNav: NavItem[] = [
  { label: '首页', to: '/home' },
  { label: '返回', to: 'BACK' },
  { label: '重来', to: '/home?reset=1' },
  { label: '帮助', to: '/help' },
]

const nowText = ref('')
let clockTimer: ReturnType<typeof window.setInterval> | undefined
let cleanupIdle: (() => void) | undefined

const route = useRoute()
const router = useRouter()

// Explicit session reset: clear guide store when navigating to home with reset=1
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
  try {
    config.value = await getConfig()
  } catch {
    config.value = null
  }
  cleanupIdle = useIdleHome(
    router,
    () => config.value?.idleSeconds ?? 90,
    resetKioskSession,
  )
})

onUnmounted(() => {
  if (clockTimer !== undefined) window.clearInterval(clockTimer)
  cleanupIdle?.()
})
</script>
