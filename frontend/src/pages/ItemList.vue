<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">事项列表</div>
    <div class="text-3xl text-slate-500" v-if="hint">{{ hint }}</div>
    <div class="grid grid-cols-1 gap-4">
      <BigCard v-for="it in items" :key="it.id" :title="it.name" @click="open(it.id)" />
    </div>
    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">加载失败：{{ err }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import { getItems } from '../api/endpoints'
import type { Item } from '../api/types'

const route = useRoute()
const router = useRouter()
const items = ref<Item[]>([])
const loading = ref(false)
const err = ref('')

const deptId = computed(() => route.query.deptId as string | undefined)
const topicId = computed(() => route.query.topicId as string | undefined)
const hint = computed(() => deptId.value ? `按部门筛选：${deptId.value}` : (topicId.value ? `按主题筛选：${topicId.value}` : ''))

function open(id: string) { router.push(`/items/${id}`) }

onMounted(async () => {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (deptId.value) qs.set('deptId', deptId.value)
    if (topicId.value) qs.set('topicId', topicId.value)
    const q = qs.toString() ? `?${qs.toString()}` : ''
    items.value = await getItems(q)
  } catch (e: any) {
    err.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
})
</script>
