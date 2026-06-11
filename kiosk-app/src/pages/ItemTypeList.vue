<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">
      <span v-if="contextLabel">{{ contextLabel }} — </span>选择事项类型
    </div>
    <div class="grid grid-cols-1 gap-4">
      <BigCard
        v-for="t in types"
        :key="t.code"
        :title="t.name"
        @click="openType(t)"
      />
    </div>
    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">{{ err }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import { getDeptItemTypes, getThemeItemTypes } from '../api/endpoints'
import type { ItemType } from '../api/types'
import { useGuideStore } from '../stores/guide'

const route = useRoute()
const router = useRouter()
const guideStore = useGuideStore()
const types = ref<ItemType[]>([])
const loading = ref(false)
const err = ref('')

const deptCode = computed(() => route.query['deptCode'] as string | undefined)
const themeCode = computed(() => route.query['themeCode'] as string | undefined)
const contextLabel = computed(() => guideStore.deptName || guideStore.themeName)

function openType(t: ItemType) {
  guideStore.itemTypeCode = t.code
  guideStore.itemTypeName = t.name
  const base = deptCode.value
    ? `deptCode=${encodeURIComponent(deptCode.value)}`
    : `themeCode=${encodeURIComponent(themeCode.value ?? '')}`
  void router.push(`/items?${base}&itemTypeCode=${encodeURIComponent(t.code)}`)
}

onMounted(async () => {
  loading.value = true
  try {
    if (deptCode.value) {
      types.value = await getDeptItemTypes(deptCode.value)
    } else if (themeCode.value) {
      types.value = await getThemeItemTypes(themeCode.value)
    }
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>
