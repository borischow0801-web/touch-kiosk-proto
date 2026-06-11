<template>
  <div class="space-y-5">
    <div class="text-4xl font-bold text-slate-900">选择部门</div>
    <div class="grid grid-cols-1 gap-4">
      <BigCard
        v-for="d in depts"
        :key="d.deptCode"
        :title="d.name"
        :meta="d.firstLetter ? '首字母：' + d.firstLetter : undefined"
        @click="openDept(d)"
      />
    </div>
    <div v-if="loading" class="text-3xl text-slate-500">加载中...</div>
    <div v-if="err" class="text-3xl text-rose-700">{{ err }}</div>
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
const err = ref('')

function openDept(dept: Dept) {
  guideStore.deptCode = dept.deptCode
  guideStore.deptName = dept.name
  guideStore.themeCode = ''
  guideStore.themeName = ''
  guideStore.itemTypeCode = ''
  guideStore.itemTypeName = ''
  void router.push(`/item-types?deptCode=${encodeURIComponent(dept.deptCode)}`)
}

onMounted(async () => {
  loading.value = true
  try {
    depts.value = await getDepts()
  } catch (e: unknown) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})
</script>
