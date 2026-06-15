<template>
  <div class="space-y-5">
    <ContentRouteFallback
      v-if="invalidRoute"
      title="参数无效"
      message="缺少有效的部门或主题信息，请返回重新选择"
    />

    <template v-else>
      <div class="text-4xl font-bold text-slate-900">
        <span v-if="contextLabel">{{ contextLabel }} — </span>选择事项类型
      </div>

      <div v-if="loading" class="text-3xl text-slate-500 py-8 text-center">加载中...</div>

      <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
        <div class="text-3xl text-rose-700">事项类型加载失败</div>
        <div class="text-3xl text-slate-500">{{ err }}</div>
        <button
          type="button"
          class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
          :disabled="retrying"
          @click="retry"
        >重试</button>
      </div>

      <template v-else>
        <div v-if="types.length === 0" class="text-3xl text-slate-400 py-12 text-center">
          暂无事项类型
        </div>
        <div v-else class="grid grid-cols-1 gap-4">
          <BigCard
            v-for="t in types"
            :key="t.code"
            :title="t.name"
            @click="openType(t)"
          />
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
import { getDeptItemTypes, getThemeItemTypes } from '../api/endpoints'
import type { ItemType } from '../api/types'
import { useGuideStore } from '../stores/guide'
import { getGuideCode, resolveItemTypeContext } from '../utils/guideRoute'
import { useRequestGuard } from '../utils/requestGuard'
import { isApiError } from '../api/errors'

const route = useRoute()
const router = useRouter()
const guideStore = useGuideStore()
const requestGuard = useRequestGuard()
const types = ref<ItemType[]>([])
const loading = ref(false)
const retrying = ref(false)
const err = ref('')
const navigating = ref(false)
const invalidRoute = ref(false)

const deptCode = computed(() => getGuideCode(route.query['deptCode']))
const themeCode = computed(() => getGuideCode(route.query['themeCode']))
const contextMode = computed(() => resolveItemTypeContext(route.query))
const contextLabel = computed(() => guideStore.deptName || guideStore.themeName)

function resolveRoute() {
  invalidRoute.value = contextMode.value == null
  if (invalidRoute.value) {
    requestGuard.invalidate()
    types.value = []
    err.value = ''
    loading.value = false
    return
  }
  if (deptCode.value && !guideStore.deptName) {
    guideStore.deptCode = deptCode.value
  }
  if (themeCode.value && !guideStore.themeName) {
    guideStore.themeCode = themeCode.value
  }
}

function openType(t: ItemType) {
  if (navigating.value || invalidRoute.value) return
  navigating.value = true
  guideStore.itemTypeCode = t.code
  guideStore.itemTypeName = t.name
  const base = contextMode.value === 'dept'
    ? `deptCode=${encodeURIComponent(deptCode.value!)}`
    : `themeCode=${encodeURIComponent(themeCode.value!)}`
  void router.push(`/items?${base}&itemTypeCode=${encodeURIComponent(t.code)}`)
    .finally(() => { navigating.value = false })
}

async function loadTypes() {
  if (invalidRoute.value || contextMode.value == null) return
  const reqId = requestGuard.begin()
  loading.value = true
  err.value = ''
  try {
    const data = contextMode.value === 'dept'
      ? await getDeptItemTypes(deptCode.value!)
      : await getThemeItemTypes(themeCode.value!)
    if (!requestGuard.isActive(reqId)) return
    types.value = data
  } catch (e: unknown) {
    if (!requestGuard.isActive(reqId)) return
    err.value = isApiError(e) ? e.message : (e instanceof Error ? e.message : String(e))
    types.value = []
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
  await loadTypes()
}

watch(
  () => [route.query['deptCode'], route.query['themeCode']],
  () => {
    resolveRoute()
    if (!invalidRoute.value) void loadTypes()
  },
  { immediate: true },
)
</script>
