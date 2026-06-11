<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">选择主题</div>
    <div class="grid grid-cols-1 gap-4">
      <BigCard
        v-for="t in themes"
        :key="t.themeCode"
        :title="t.name"
        @click="openTheme(t)"
      />
    </div>
    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">{{ err }}</div>
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
const err = ref('')

function openTheme(theme: Theme) {
  guideStore.themeCode = theme.themeCode
  guideStore.themeName = theme.name
  guideStore.deptCode = ''
  guideStore.deptName = ''
  guideStore.itemTypeCode = ''
  guideStore.itemTypeName = ''
  void router.push(`/item-types?themeCode=${encodeURIComponent(theme.themeCode)}`)
}

onMounted(async () => {
  loading.value = true
  try {
    themes.value = await getThemes()
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>
