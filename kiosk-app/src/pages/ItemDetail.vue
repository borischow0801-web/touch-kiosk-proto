<template>
  <div class="space-y-6 pb-8">
    <ContentRouteFallback
      v-if="invalidRoute"
      title="参数无效"
      message="事项编号无效，请返回重新选择"
    />

    <template v-else>
      <div v-if="loading" class="text-3xl text-slate-500 py-8 text-center">加载中...</div>

      <div v-else-if="notFound" class="rounded-2xl bg-white border border-slate-200 p-8 space-y-4 text-center">
        <div class="text-4xl font-bold text-slate-900">事项不存在</div>
        <div class="text-3xl text-slate-500">{{ err }}</div>
      </div>

      <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
        <div class="text-3xl text-rose-700">事项详情加载失败</div>
        <div class="text-3xl text-slate-500">{{ err }}</div>
        <button
          type="button"
          class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
          :disabled="retrying"
          @click="retry"
        >重试</button>
      </div>

      <template v-else-if="data">
        <section class="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div class="text-5xl font-bold text-slate-900">{{ data.basicInfo.name }}</div>
          <div>
            <div class="text-3xl text-slate-500">主管部门</div>
            <div class="text-3xl text-slate-700 mt-2">{{ displayOrEmpty(data.basicInfo.deptName) }}</div>
          </div>
          <div>
            <div class="text-3xl text-slate-500">所属主题</div>
            <div class="text-3xl text-slate-700 mt-2">{{ themeText }}</div>
          </div>
          <div>
            <div class="text-3xl text-slate-500">事项摘要</div>
            <div class="text-3xl text-slate-700 mt-2">{{ displayOrEmpty(data.basicInfo.summary) }}</div>
          </div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">受理条件</div>
          <template v-if="data.acceptConditions?.length">
            <div v-for="(c, i) in data.acceptConditions" :key="i" class="text-3xl text-slate-700 mt-3">• {{ c }}</div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">材料清单</div>
          <template v-if="data.materials?.length">
            <div v-for="(m, i) in data.materials" :key="i" class="text-3xl text-slate-700 mt-3">
              • {{ m.name }}{{ !m.required ? '（非必须）' : '' }}{{ m.note ? ' — ' + m.note : '' }}
            </div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">办理流程</div>
          <template v-if="data.processSteps?.length">
            <div v-for="s in data.processSteps" :key="s.step" class="text-3xl text-slate-700 mt-3">
              {{ s.step }}. {{ s.name }}{{ s.description ? ' — ' + s.description : '' }}
            </div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">办理地点</div>
          <template v-if="data.locations?.length">
            <div v-for="(l, i) in data.locations" :key="i" class="text-3xl text-slate-700 mt-3">
              {{ [l.floor, l.area, l.name].filter(Boolean).join(' ') }}{{ l.address ? '，' + l.address : '' }}
            </div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>

          <div class="text-4xl font-bold text-slate-900 mt-6">办理时间</div>
          <div class="text-3xl text-slate-700 mt-3">{{ displayOrEmpty(data.workTime) }}</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">承诺时限</div>
          <div class="text-3xl text-slate-700 mt-3">{{ displayOrEmpty(data.timeLimit) }}</div>

          <div class="text-4xl font-bold text-slate-900 mt-6">收费标准</div>
          <div class="text-3xl text-slate-700 mt-3">{{ displayOrEmpty(data.fee) }}</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">法律依据</div>
          <template v-if="data.legalBasis?.length">
            <div v-for="(b, i) in data.legalBasis" :key="i" class="text-3xl text-slate-700 mt-3">• {{ b }}</div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">咨询电话</div>
          <div class="text-3xl text-slate-700 mt-3">{{ displayOrEmpty(data.consultationPhone) }}</div>

          <div class="text-4xl font-bold text-slate-900 mt-6">投诉电话</div>
          <div class="text-3xl text-slate-700 mt-3">{{ displayOrEmpty(data.complaintPhone) }}</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">关联政策</div>
          <template v-if="data.relatedPolicies?.length">
            <div v-for="p in data.relatedPolicies" :key="p.id" class="text-3xl text-slate-700 mt-3">• {{ p.title }}</div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
        </section>

        <section class="rounded-2xl bg-white border border-slate-200 p-6">
          <div class="text-4xl font-bold text-slate-900">常见问题</div>
          <template v-if="data.relatedFaqs?.length">
            <div v-for="f in data.relatedFaqs" :key="f.id" class="text-3xl text-slate-700 mt-3">• {{ f.title }}</div>
          </template>
          <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ContentRouteFallback from '../components/ContentRouteFallback.vue'
import { getItemDetail, postClick } from '../api/endpoints'
import type { ItemDetail } from '../api/types'
import { displayOrEmpty } from '../utils/formatContent'
import { getItemIdParam } from '../utils/guideRoute'
import { useRequestGuard } from '../utils/requestGuard'
import { isApiError } from '../api/errors'

const route = useRoute()
const requestGuard = useRequestGuard()
const data = ref<ItemDetail | null>(null)
const loading = ref(false)
const retrying = ref(false)
const err = ref('')
const notFound = ref(false)
const invalidRoute = ref(false)

const itemId = computed(() => getItemIdParam(route.params['itemId']))

const themeText = computed(() => {
  const names = data.value?.basicInfo?.themeNames ?? []
  if (names.length === 0) return '暂无相关信息'
  return names.join('、')
})

function resolveRoute() {
  invalidRoute.value = !itemId.value
  if (invalidRoute.value) {
    requestGuard.invalidate()
    data.value = null
    err.value = ''
    notFound.value = false
    loading.value = false
  }
}

async function loadDetail() {
  if (invalidRoute.value || !itemId.value) return
  const reqId = requestGuard.begin()
  loading.value = true
  err.value = ''
  notFound.value = false
  data.value = null
  try {
    const detail = await getItemDetail(itemId.value)
    if (!requestGuard.isActive(reqId)) return
    data.value = detail
    postClick({ type: 'item_view', id: itemId.value, ts: Date.now() }).catch(() => {})
  } catch (e: unknown) {
    if (!requestGuard.isActive(reqId)) return
    if (isApiError(e)) {
      err.value = e.message
      notFound.value = e.isNotFound
    } else {
      err.value = e instanceof Error ? e.message : String(e)
      notFound.value = false
    }
  } finally {
    if (requestGuard.isActive(reqId)) {
      loading.value = false
      retrying.value = false
    }
  }
}

async function retry() {
  if (retrying.value || notFound.value) return
  retrying.value = true
  await loadDetail()
}

watch(
  () => route.params['itemId'],
  () => {
    resolveRoute()
    if (!invalidRoute.value) void loadDetail()
  },
  { immediate: true },
)
</script>
