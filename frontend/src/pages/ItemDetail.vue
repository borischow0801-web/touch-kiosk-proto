<template>
  <div class="space-y-6">
    <div class="text-5xl font-bold text-slate-900">{{ data?.name ?? '事项详情' }}</div>

    <section class="rounded-2xl bg-white border border-slate-200 p-6">
      <div class="text-4xl font-bold text-slate-900">办理地点</div>
      <div class="text-3xl text-slate-700 mt-3 selectable">{{ data?.locationText ?? '-' }}</div>
      <div class="text-4xl font-bold text-slate-900 mt-6">办理时间</div>
      <div class="text-3xl text-slate-700 mt-3 selectable">{{ data?.workTimeText ?? '-' }}</div>
    </section>

    <section class="rounded-2xl bg-white border border-slate-200 p-6">
      <div class="text-4xl font-bold text-slate-900">材料清单</div>
      <ul class="mt-3 space-y-2">
        <li v-for="(m, idx) in (data?.materials ?? [])" :key="idx" class="text-3xl text-slate-700 selectable">• {{ m }}</li>
      </ul>
    </section>

    <section class="rounded-2xl bg-white border border-slate-200 p-6">
      <div class="text-4xl font-bold text-slate-900">办理流程</div>
      <ol class="mt-3 space-y-2">
        <li v-for="(s, idx) in (data?.steps ?? [])" :key="idx" class="text-3xl text-slate-700 selectable">{{ idx+1 }}. {{ s }}</li>
      </ol>
    </section>

    <section v-if="data?.tips?.length" class="rounded-2xl bg-white border border-slate-200 p-6">
      <div class="text-4xl font-bold text-slate-900">温馨提示</div>
      <ul class="mt-3 space-y-2">
        <li v-for="(t, idx) in data?.tips" :key="idx" class="text-3xl text-slate-700 selectable">• {{ t }}</li>
      </ul>
    </section>

    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">加载失败：{{ err }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getItemDetail, postClick } from '../api/endpoints'
import type { ItemDetail } from '../api/types'

const route = useRoute()
const data = ref<ItemDetail | null>(null)
const loading = ref(false)
const err = ref('')

onMounted(async () => {
  const id = route.params.id as string
  loading.value = true
  try {
    data.value = await getItemDetail(id)
    postClick({ type: 'item_view', id, ts: Date.now() }).catch(() => {})
  } catch (e: any) {
    err.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
})
</script>
