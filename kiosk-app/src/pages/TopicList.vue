<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">选择主题</div>

    <div v-if="loading" class="text-3xl text-slate-500 py-8 text-center">加载中...</div>

    <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
      <div class="text-3xl text-rose-700">主题加载失败</div>
      <div class="text-3xl text-slate-500">{{ err }}</div>
      <button
        type="button"
        class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
        :disabled="retrying"
        @click="retry"
      >重试</button>
    </div>

    <template v-else>
      <div v-if="themes.length === 0" class="text-3xl text-slate-400 py-12 text-center">
        暂无主题配置，请联系工作人员
      </div>
      <div v-else class="grid grid-cols-1 gap-4">
        <BigCard
          v-for="t in themes"
          :key="t.themeCode"
          :title="t.name"
          @click="openTheme(t)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import { getThemes } from '../api/endpoints'
import type { Theme } from '../api/types'
import { useGuideStore } from '../stores/guide'

const router = useRouter()
const guideStore = useGuideStore()
const themes = ref<Theme[]>([])
const loading = ref(false)
const retrying = ref(false)
const err = ref('')
const loadingLock = ref(false)
const navigating = ref(false)

function openTheme(theme: Theme) {
  if (navigating.value) return
  navigating.value = true
  guideStore.themeCode = theme.themeCode
  guideStore.themeName = theme.name
  guideStore.deptCode = ''
  guideStore.deptName = ''
  guideStore.itemTypeCode = ''
  guideStore.itemTypeName = ''
  void router.push(`/item-types?themeCode=${encodeURIComponent(theme.themeCode)}`)
    .finally(() => { navigating.value = false })
}

async function loadThemes() {
  if (loadingLock.value) return
  loadingLock.value = true
  loading.value = true
  err.value = ''
  try {
    themes.value = await getThemes()
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
    themes.value = []
  } finally {
    loading.value = false
    loadingLock.value = false
    retrying.value = false
  }
}

async function retry() {
  if (retrying.value) return
  retrying.value = true
  await loadThemes()
}

onMounted(() => { void loadThemes() })
</script>
