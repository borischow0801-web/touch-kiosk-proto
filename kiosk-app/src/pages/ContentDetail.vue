<template>
  <div class="space-y-6 pb-8">
    <ContentRouteFallback
      v-if="invalidRoute"
      title="页面不存在"
      message="未找到该内容详情，请返回首页重新选择"
    />

    <template v-else>
      <div v-if="loading" class="text-3xl text-slate-500 py-8">加载中...</div>

      <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
        <div class="text-3xl text-rose-700">内容加载失败</div>
        <div class="text-3xl text-slate-500">{{ err }}</div>
        <button
          type="button"
          class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
          :disabled="retrying"
          @click="retry"
        >重试</button>
      </div>

      <template v-else-if="data">
        <div
          v-if="data.coverFileId"
          class="rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center"
          style="min-height: 200px;"
        >
          <span class="text-3xl text-slate-400">封面图待接入</span>
        </div>

        <div class="text-5xl font-bold text-slate-900">{{ data.title }}</div>
        <div v-if="data.subtitle" class="text-3xl text-slate-600">{{ data.subtitle }}</div>

        <section class="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div>
            <div class="text-3xl text-slate-500">摘要</div>
            <div class="text-3xl text-slate-700 mt-2">{{ displayOrEmpty(data.summary) }}</div>
          </div>
          <div>
            <div class="text-3xl text-slate-500">发布日期</div>
            <div class="text-3xl text-slate-700 mt-2">{{ formatPublishAt(data.publishAt) }}</div>
          </div>
          <div>
            <div class="text-3xl text-slate-500">来源</div>
            <div class="text-3xl text-slate-700 mt-2">{{ formatSource(data.sourceType, data.sourceUrl) }}</div>
          </div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">正文</div>
          <SafeBody :body="data.body" />
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SafeBody from '../components/SafeBody.vue'
import ContentRouteFallback from '../components/ContentRouteFallback.vue'
import { getPublicContentDetail } from '../api/endpoints'
import type { PublicContentDetail } from '../api/types'
import { getContentModule } from '../content/modules'
import { displayOrEmpty, formatPublishAt, formatSource } from '../utils/formatContent'
import { useContentStore } from '../stores/content'

const route = useRoute()
const contentStore = useContentStore()

const data = ref<PublicContentDetail | null>(null)
const loading = ref(false)
const retrying = ref(false)
const err = ref('')
const loadingLock = ref(false)
const invalidRoute = ref(false)

const routeKey = computed(() => route.params['type'] as string)
const itemId = computed(() => route.params['id'] as string)
const moduleConfig = computed(() => getContentModule(routeKey.value))

async function loadDetail() {
  if (loadingLock.value || invalidRoute.value) return
  const mod = moduleConfig.value
  if (!mod?.supportsDetail) {
    invalidRoute.value = true
    return
  }

  loadingLock.value = true
  loading.value = true
  err.value = ''
  try {
    data.value = await getPublicContentDetail(mod.apiSegment, itemId.value)
    contentStore.rememberDetail(routeKey.value, itemId.value)
  } catch (e: unknown) {
    data.value = null
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
    loadingLock.value = false
    retrying.value = false
  }
}

async function retry() {
  if (retrying.value) return
  retrying.value = true
  await loadDetail()
}

function resolveRoute() {
  const mod = moduleConfig.value
  invalidRoute.value = !mod || !mod.supportsDetail
  if (invalidRoute.value) {
    data.value = null
    err.value = ''
    loading.value = false
    loadingLock.value = false
    return
  }
}

function scheduleDetailLoad() {
  if (invalidRoute.value || !moduleConfig.value?.supportsDetail) return
  void loadDetail()
}

watch([routeKey, itemId], resolveRoute, { immediate: true })
watch([routeKey, itemId], scheduleDetailLoad)
onMounted(scheduleDetailLoad)
</script>
