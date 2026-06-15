<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">选择部门</div>

    <div v-if="loading" class="text-3xl text-slate-500 py-8 text-center">加载中...</div>

    <div v-else-if="err" class="rounded-2xl bg-white border border-rose-200 p-6 space-y-4">
      <div class="text-3xl text-rose-700">部门加载失败</div>
      <div class="text-3xl text-slate-500">{{ err }}</div>
      <button
        type="button"
        class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
        :disabled="retrying"
        @click="retry"
      >重试</button>
    </div>

    <template v-else>
      <div v-if="depts.length === 0" class="text-3xl text-slate-400 py-12 text-center">
        暂无部门配置，请联系工作人员
      </div>
      <div v-else class="grid grid-cols-1 gap-4">
        <BigCard
          v-for="d in depts"
          :key="d.deptCode"
          :title="d.name"
          :meta="d.firstLetter ? '首字母：' + d.firstLetter : undefined"
          @click="openDept(d)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BigCard from '../components/BigCard.vue'
import { getDepts } from '../api/endpoints'
import type { Dept } from '../api/types'
import { useGuideStore } from '../stores/guide'

const router = useRouter()
const guideStore = useGuideStore()
const depts = ref<Dept[]>([])
const loading = ref(false)
const retrying = ref(false)
const err = ref('')
const loadingLock = ref(false)
const navigating = ref(false)

function openDept(dept: Dept) {
  if (navigating.value) return
  navigating.value = true
  guideStore.deptCode = dept.deptCode
  guideStore.deptName = dept.name
  guideStore.themeCode = ''
  guideStore.themeName = ''
  guideStore.itemTypeCode = ''
  guideStore.itemTypeName = ''
  void router.push(`/item-types?deptCode=${encodeURIComponent(dept.deptCode)}`)
    .finally(() => { navigating.value = false })
}

async function loadDepts() {
  if (loadingLock.value) return
  loadingLock.value = true
  loading.value = true
  err.value = ''
  try {
    depts.value = await getDepts()
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
    depts.value = []
  } finally {
    loading.value = false
    loadingLock.value = false
    retrying.value = false
  }
}

async function retry() {
  if (retrying.value) return
  retrying.value = true
  await loadDepts()
}

onMounted(() => { void loadDepts() })
</script>
