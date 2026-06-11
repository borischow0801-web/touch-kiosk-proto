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

const router = useRouter()
const hotItems = ref<HotItem[]>([])
const err = ref('')

function go(path: string) { void router.push(path) }
function openItem(id: string) { void router.push(`/items/${id}`) }

onMounted(async () => {
  try {
    hotItems.value = (await getConfig()).homeHotItems ?? []
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  }
})
</script>
