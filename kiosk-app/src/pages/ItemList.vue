<template>
  <div class="space-y-5">
    <ContentRouteFallback
      v-if="invalidRoute"
      title="参数无效"
      message="缺少有效的部门/主题与事项类型，请返回重新选择"
    />

    <template v-else>
      <div class="text-4xl font-bold text-slate-900">事项列表</div>
      <div v-if="breadcrumb" class="text-3xl text-slate-500">{{ breadcrumb }}</div>

      <div v-if="loading" class="text-3xl text-slate-500 py-8 text-center">加载中...</div>

      <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
        <div class="text-3xl text-rose-700">事项列表加载失败</div>
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
          暂无相关事项
        </div>
        <div v-else class="grid grid-cols-1 gap-4">
          <BigCard
            v-for="it in result.list"
            :key="it.itemId"
            :title="it.name"
            @click="open(it.itemId)"
          />
        </div>

        <div v-if="result.total > result.pageSize" class="flex gap-4 pt-4 items-center">
          <button
            v-if="page > 1"
            type="button"
            class="flex-1 rounded-2xl bg-white border border-slate-200 py-8 text-3xl font-bold text-slate-800 active:scale-[0.99]"
            :disabled="loading || navigating"
            @click="prevPage"
          >上一页</button>
          <div class="text-2xl text-slate-500 whitespace-nowrap px-2">
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import ContentRouteFallback from '../components/ContentRouteFallback.vue'
import { getItems } from '../api/endpoints'
import type { PageResult, Item } from '../api/types'
import { useGuideStore } from '../stores/guide'
import {
  buildListScopeKey,
  extractQueryString,
  getGuideCode,
  isInvalidPageQuery,
  parsePageQuery,
  resolveItemListContext,
} from '../utils/guideRoute'
import { useRequestGuard } from '../utils/requestGuard'
import { isApiError } from '../api/errors'

const PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()
const guideStore = useGuideStore()
const requestGuard = useRequestGuard()
const result = ref<PageResult<Item> | null>(null)
const loading = ref(false)
const retrying = ref(false)
const err = ref('')
const page = ref(1)
const navigating = ref(false)
const invalidRoute = ref(false)
const scopeKey = ref('')

const deptCode = computed(() => getGuideCode(route.query['deptCode']))
const themeCode = computed(() => getGuideCode(route.query['themeCode']))
const itemTypeCode = computed(() => getGuideCode(route.query['itemTypeCode']))

const breadcrumb = computed(() => {
  const parts = [
    guideStore.deptName || guideStore.themeName,
    guideStore.itemTypeName,
  ].filter(Boolean)
  return parts.join(' › ')
})

const totalPages = computed(() => {
  if (!result.value) return 1
  return Math.max(1, Math.ceil(result.value.total / result.value.pageSize))
})

function buildItemsQuery() {
  return {
    deptCode: deptCode.value,
    themeCode: themeCode.value,
    itemTypeCode: itemTypeCode.value!,
    page: page.value,
    pageSize: PAGE_SIZE,
  }
}

function buildUrlQuery(pageNum = page.value): Record<string, string> {
  const query: Record<string, string> = {
    itemTypeCode: itemTypeCode.value!,
  }
  if (deptCode.value) {
    query.deptCode = deptCode.value
  } else if (themeCode.value) {
    query.themeCode = themeCode.value
  }
  if (pageNum > 1) {
    query.page = String(pageNum)
  }
  return query
}

function clearListState() {
  requestGuard.invalidate()
  result.value = null
  err.value = ''
  loading.value = false
  scopeKey.value = ''
}

type RouteSyncAction = 'skip' | 'replace' | 'load'

function planRouteSync(): RouteSyncAction {
  invalidRoute.value = !resolveItemListContext(route.query)
  if (invalidRoute.value) {
    clearListState()
    return 'skip'
  }

  const nextScopeKey = buildListScopeKey(route.query) ?? ''
  const scopeChanged = Boolean(guideStore.listScopeKey && guideStore.listScopeKey !== nextScopeKey)
  scopeKey.value = nextScopeKey

  if (isInvalidPageQuery(route.query['page'])) {
    page.value = 1
    guideStore.rememberListPage(nextScopeKey, 1)
    return 'replace'
  }

  if (scopeChanged) {
    page.value = 1
    guideStore.rememberListPage(nextScopeKey, 1)
    if (extractQueryString(route.query['page']) !== undefined) {
      return 'replace'
    }
  } else {
    page.value = parsePageQuery(route.query['page'])
    guideStore.rememberListPage(nextScopeKey, page.value)
  }

  return 'load'
}

async function applyRouteSync() {
  const action = planRouteSync()
  if (action === 'skip') return
  if (action === 'replace') {
    await router.replace({ path: '/items', query: buildUrlQuery(1) })
    return
  }
  await loadItems()
}

function open(itemId: string) {
  if (navigating.value) return
  navigating.value = true
  void router.push(`/items/${itemId}`)
    .finally(() => { navigating.value = false })
}

function goToPage(target: number) {
  if (loading.value || invalidRoute.value) return
  void router.replace({ path: '/items', query: buildUrlQuery(target) })
}

function prevPage() {
  if (page.value <= 1 || loading.value) return
  goToPage(page.value - 1)
}

function nextPage() {
  if (!result.value || page.value >= totalPages.value || loading.value) return
  goToPage(page.value + 1)
}

async function loadItems() {
  if (invalidRoute.value) return
  const reqId = requestGuard.begin()
  loading.value = true
  err.value = ''
  try {
    const data = await getItems(buildItemsQuery())
    if (!requestGuard.isActive(reqId)) return
    result.value = data
    guideStore.rememberListPage(scopeKey.value, page.value)
  } catch (e: unknown) {
    if (!requestGuard.isActive(reqId)) return
    err.value = isApiError(e) ? e.message : (e instanceof Error ? e.message : String(e))
    result.value = null
  } finally {
    if (requestGuard.isActive(reqId)) {
      loading.value = false
      retrying.value = false
    }
  }
}

async function retry() {
  if (retrying.value) return
  retrying.value = true
  await loadItems()
}

watch(
  () => ({
    dept: route.query['deptCode'],
    theme: route.query['themeCode'],
    type: route.query['itemTypeCode'],
    page: route.query['page'],
  }),
  () => { void applyRouteSync() },
  { immediate: true },
)
</script>
