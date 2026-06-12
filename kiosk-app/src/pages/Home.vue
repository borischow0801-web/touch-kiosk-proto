<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-5">
      <BigButton
        v-for="it in hotItems"
        :key="it.id"
        :title="it.name"
        :heightPx="160"
        @click="openItem(it.id)"
      />
    </div>

    <div class="grid grid-cols-2 gap-5 pt-2">
      <BigButton title="按部门查" subtitle="选择部门 → 事项类型 → 事项" :heightPx="160" @click="go('/depts')" />
      <BigButton title="按主题查" subtitle="选择主题 → 事项类型 → 事项" :heightPx="160" @click="go('/topics')" />
    </div>

    <div class="pt-4">
      <div class="text-4xl font-bold text-slate-900 mb-4">政务公开</div>
      <div class="grid grid-cols-2 gap-5">
        <BigButton
          v-for="mod in contentModules"
          :key="mod.routeKey"
          :title="mod.homeLabel"
          :subtitle="mod.supportsDetail ? '点击查看列表' : '仅列表浏览'"
          :heightPx="140"
          @click="openContent(mod.routeKey)"
        />
      </div>
    </div>

    <div v-if="err" class="rounded-2xl bg-white border border-rose-200 p-6">
      <div class="text-3xl text-rose-700">数据加载失败</div>
      <div class="text-3xl text-slate-500 mt-2">{{ err }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BigButton from '../components/BigButton.vue'
import { getConfig } from '../api/endpoints'
import type { HotItem } from '../api/types'
import { HOME_CONTENT_MODULES } from '../content/modules'

const router = useRouter()
const hotItems = ref<HotItem[]>([])
const err = ref('')
const contentModules = HOME_CONTENT_MODULES
const navigating = ref(false)

function go(path: string) { void router.push(path) }
function openItem(id: string) { void router.push(`/items/${id}`) }

async function openContent(routeKey: string) {
  if (navigating.value) return
  navigating.value = true
  try {
    await router.push(`/content/${routeKey}`)
  } finally {
    navigating.value = false
  }
}

onMounted(async () => {
  try {
    hotItems.value = (await getConfig()).homeHotItems ?? []
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  }
})
</script>
