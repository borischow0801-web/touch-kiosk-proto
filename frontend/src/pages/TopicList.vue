<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">选择主题</div>
    <div class="grid grid-cols-1 gap-4">
      <BigCard v-for="t in topics" :key="t.id" :title="t.name" @click="openTopic(t.id)" />
    </div>
    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">加载失败：{{ err }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import { getTopics } from '../api/endpoints'
import type { Topic } from '../api/types'

const router = useRouter()
const topics = ref<Topic[]>([])
const loading = ref(false)
const err = ref('')
function openTopic(topicId: string) { router.push(`/items?topicId=${encodeURIComponent(topicId)}`) }

onMounted(async () => {
  loading.value = true
  try { topics.value = await getTopics() }
  catch (e: any) { err.value = e?.message ?? String(e) }
  finally { loading.value = false }
})
</script>
