<template>
  <div class="space-y-5">
    <ContentRouteFallback
      v-if="invalidRoute"
      title="页面不存在"
      message="未找到该政务公开栏目，请返回首页重新选择"
    />

    <template v-else>
      <div class="text-4xl font-bold text-slate-900">{{ moduleTitle }}</div>

      <div v-if="loading" class="text-3xl text-slate-500 py-8 text-center">加载中...</div>

      <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
        <div class="text-3xl text-rose-700">数据加载失败</div>
        <div class="text-3xl text-slate-500">{{ err }}</div>
        <button
          type="button"
          class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
          :disabled="retrying"
          @click="retry"
        >重试</button>
      </div>

      <template v-else-if="result">
        <div v-if="result.list.length === 0" class="text-3xl text-slate-400 py-12 text-center">
          暂无相关内容
        </div>

        <div v-else class="grid grid-cols-1 gap-4">
          <ContentListItem
            v-for="item in result.list"
            :key="item.id"
            :title="item.title"
            :meta="cardMeta(item)"
            :summary="listOnlySummary(item)"
            :interactive="supportsDetail"
            @activate="onCardClick(item.id)"
          />
        </div>

        <div v-if="result.total > result.pageSize" class="flex gap-4 pt-4">
          <button
            v-if="page > 1"
            type="button"
            class="flex-1 rounded-2xl bg-white border border-slate-200 py-8 text-3xl font-bold text-slate-800 active:scale-[0.99]"
            :disabled="loading || navigating"
            @click="prevPage"
          >上一页</button>
          <div class="flex items-center px-4 text-2xl text-slate-500 whitespace-nowrap">
            {{ page }} / {{ totalPages }}
          </div>
          <button
            v-if="page < totalPages"
            type="button"
            class="flex-1 rounded-2xl bg-white border border-slate-200 py-8 text-3xl font-bold text-slate-800 active:scale-[0.99]"
            :disabled="loading || navigating"
            @click="nextPage"
          >下一页</button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ContentListItem from '../components/ContentListItem.vue'
import ContentRouteFallback from '../components/ContentRouteFallback.vue'
import { getPublicContentList } from '../api/endpoints'
import type { PageResult, PublicContentListItem } from '../api/types'
import { getContentModule } from '../content/modules'
import { formatPublishAt } from '../utils/formatContent'
import { useContentStore } from '../stores/content'

const route = useRoute()
const router = useRouter()
const contentStore = useContentStore()

const result = ref<PageResult<PublicContentListItem> | null>(null)
const loading = ref(false)
const retrying = ref(false)
const navigating = ref(false)
const err = ref('')
const page = ref(1)
const invalidRoute = ref(false)
const listLoadingLock = ref(false)

const routeKey = computed(() => route.params['type'] as string)
const moduleConfig = computed(() => getContentModule(routeKey.value))
const moduleTitle = computed(() => moduleConfig.value?.title ?? '政务公开')
const supportsDetail = computed(() => moduleConfig.value?.supportsDetail ?? false)
const totalPages = computed(() => {
  if (!result.value) return 1
  return Math.max(1, Math.ceil(result.value.total / result.value.pageSize))
})

function cardMeta(item: PublicContentListItem): string {
  return formatPublishAt(item.publishAt)
}

function listOnlySummary(item: PublicContentListItem): string | undefined {
  if (supportsDetail.value) return undefined
  return item.summary?.trim() || undefined
}

async function loadList() {
  if (listLoadingLock.value || invalidRoute.value || !moduleConfig.value) return
  listLoadingLock.value = true
  loading.value = true
  err.value = ''
  try {
    result.value = await getPublicContentList(moduleConfig.value.apiSegment, {
      page: page.value,
      pageSize: 10,
    })
    contentStore.rememberList(routeKey.value, page.value)
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
    result.value = null
  } finally {
    loading.value = false
    listLoadingLock.value = false
    retrying.value = false
  }
}

async function retry() {
  if (retrying.value) return
  retrying.value = true
  await loadList()
}

function prevPage() {
  if (page.value <= 1 || loading.value) return
  page.value--
  void loadList()
}

function nextPage() {
  if (!result.value || page.value >= totalPages.value || loading.value) return
  page.value++
  void loadList()
}

async function onCardClick(id: string) {
  if (!supportsDetail.value || navigating.value) return
  navigating.value = true
  try {
    contentStore.rememberDetail(routeKey.value, id)
    await router.push(`/content/${routeKey.value}/${id}`)
  } finally {
    navigating.value = false
  }
}

function resolveRoute() {
  invalidRoute.value = !moduleConfig.value
  if (invalidRoute.value) {
    result.value = null
    err.value = ''
    loading.value = false
    listLoadingLock.value = false
    return
  }
  page.value = contentStore.listType === routeKey.value ? contentStore.page : 1
}

function scheduleListLoad() {
  if (invalidRoute.value || !moduleConfig.value) return
  void loadList()
}

watch(routeKey, resolveRoute, { immediate: true })
watch(routeKey, scheduleListLoad)
onMounted(scheduleListLoad)
</script>
