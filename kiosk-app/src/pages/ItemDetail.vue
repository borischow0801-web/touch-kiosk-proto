<template>
  <div class="space-y-6">
    <div class="text-5xl font-bold text-slate-900">{{ data?.basicInfo?.name ?? '事项详情' }}</div>
    <div v-if="data?.basicInfo?.deptName" class="text-3xl text-slate-500">
      {{ data.basicInfo.deptName }}
    </div>

    <template v-if="data">
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
        <div v-if="data.workTime" class="text-3xl text-slate-700 mt-3">{{ data.workTime }}</div>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
      </section>

      <section class="rounded-2xl bg-white border border-slate-200 p-6">
        <div class="text-4xl font-bold text-slate-900">承诺时限</div>
        <div v-if="data.timeLimit" class="text-3xl text-slate-700 mt-3">{{ data.timeLimit }}</div>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>

        <div class="text-4xl font-bold text-slate-900 mt-6">收费标准</div>
        <div v-if="data.fee" class="text-3xl text-slate-700 mt-3">{{ data.fee }}</div>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
      </section>

      <!-- Always shown, empty state when no legal basis -->
      <section class="rounded-2xl bg-white border border-slate-200 p-6">
        <div class="text-4xl font-bold text-slate-900">法律依据</div>
        <template v-if="data.legalBasis?.length">
          <div v-for="(b, i) in data.legalBasis" :key="i" class="text-3xl text-slate-700 mt-3">• {{ b }}</div>
        </template>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
      </section>

      <section class="rounded-2xl bg-white border border-slate-200 p-6">
        <div class="text-4xl font-bold text-slate-900">咨询电话</div>
        <div v-if="data.consultationPhone" class="text-3xl text-slate-700 mt-3">{{ data.consultationPhone }}</div>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>

        <!-- Always shown, empty state when no complaint phone -->
        <div class="text-4xl font-bold text-slate-900 mt-6">投诉电话</div>
        <div v-if="data.complaintPhone" class="text-3xl text-slate-700 mt-3">{{ data.complaintPhone }}</div>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
      </section>

      <!-- Always shown, empty state when no related policies -->
      <section class="rounded-2xl bg-white border border-slate-200 p-6">
        <div class="text-4xl font-bold text-slate-900">关联政策</div>
        <template v-if="data.relatedPolicies?.length">
          <div v-for="p in data.relatedPolicies" :key="p.id" class="text-3xl text-slate-700 mt-3">• {{ p.title }}</div>
        </template>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
      </section>

      <!-- Always shown, empty state when no related FAQs -->
      <section class="rounded-2xl bg-white border border-slate-200 p-6">
        <div class="text-4xl font-bold text-slate-900">常见问题</div>
        <template v-if="data.relatedFaqs?.length">
          <div v-for="f in data.relatedFaqs" :key="f.id" class="text-3xl text-slate-700 mt-3">• {{ f.title }}</div>
        </template>
        <div v-else class="text-3xl text-slate-400 mt-3 italic">暂无相关信息</div>
      </section>
    </template>

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
  const itemId = route.params['itemId'] as string
  loading.value = true
  try {
    data.value = await getItemDetail(itemId)
    postClick({ type: 'item_view', id: itemId, ts: Date.now() }).catch(() => {})
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>
