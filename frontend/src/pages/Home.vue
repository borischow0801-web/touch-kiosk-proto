<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-5">
      <BigButton v-for="it in hotItems" :key="it.id" :title="it.name" :heightPx="160" @click="openItem(it.id)" />
    </div>

    <div class="grid grid-cols-2 gap-5 pt-2">
      <BigButton title="按部门查" subtitle="选择部门 → 事项 → 详情" :heightPx="160" @click="go('/depts')" />
      <BigButton title="按主题查" subtitle="选择主题 → 事项 → 详情" :heightPx="160" @click="go('/topics')" />
    </div>

    <div v-if="err" class="rounded-2xl bg-white border border-rose-200 p-6">
      <div class="text-3xl text-rose-700">配置/数据加载失败：{{ err }}</div>
      <div class="text-3xl text-slate-500 mt-2">请检查网络与后端服务（/api）。</div>
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

function go(path: string) { router.push(path) }
function openItem(id: string) { router.push(`/items/${id}`) }

onMounted(async () => {
  try { hotItems.value = (await getConfig()).homeHotItems ?? [] }
  catch (e: any) { err.value = e?.message ?? String(e) }
})
</script>
