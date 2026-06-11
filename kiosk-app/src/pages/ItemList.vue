<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">事项列表</div>
    <div v-if="breadcrumb" class="text-3xl text-slate-500">{{ breadcrumb }}</div>
    <div class="grid grid-cols-1 gap-4">
      <BigCard
        v-for="it in (result?.list ?? [])"
        :key="it.itemId"
        :title="it.name"
        @click="open(it.itemId)"
      />
    </div>
    <div v-if="!loading && !err && result && result.list.length === 0"
      class="text-3xl text-slate-400 py-12 text-center">暂无相关事项</div>
    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">{{ err }}</div>

    <div v-if="result && result.total > result.pageSize" class="flex gap-4 pt-4">
      <button
        v-if="page > 1"
        class="flex-1 rounded-2xl bg-white border border-slate-200 py-8 text-3xl font-bold text-slate-800 active:scale-[0.99]"
        @click="prevPage"
      >上一页</button>
      <button
        v-if="result.page * result.pageSize < result.total"
        class="flex-1 rounded-2xl bg-white border border-slate-200 py-8 text-3xl font-bold text-slate-800 active:scale-[0.99]"
        @click="nextPage"
      >下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import { getItems } from '../api/endpoints'
import type { PageResult, Item } from '../api/types'
import { useGuideStore } from '../stores/guide'

const route = useRoute()
const router = useRouter()
const guideStore = useGuideStore()
const result = ref<PageResult<Item> | null>(null)
const loading = ref(false)
const err = ref('')
const page = ref(1)

const deptCode = computed(() => route.query['deptCode'] as string | undefined)
const themeCode = computed(() => route.query['themeCode'] as string | undefined)
const itemTypeCode = computed(() => route.query['itemTypeCode'] as string | undefined)

const breadcrumb = computed(() => {
  const parts = [
    guideStore.deptName || guideStore.themeName,
    guideStore.itemTypeName,
  ].filter(Boolean)
  return parts.join(' › ')
})

function open(itemId: string) {
  void router.push(`/items/${itemId}`)
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    void loadItems()
  }
}

function nextPage() {
  page.value++
  void loadItems()
}

async function loadItems() {
  loading.value = true
  err.value = ''
  try {
    result.value = await getItems({
      deptCode: deptCode.value,
      themeCode: themeCode.value,
      itemTypeCode: itemTypeCode.value,
      page: page.value,
      pageSize: 20,
    })
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { void loadItems() })
</script>
