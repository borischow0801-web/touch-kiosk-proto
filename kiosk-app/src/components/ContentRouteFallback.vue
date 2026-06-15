<template>
  <div class="rounded-2xl bg-white border border-slate-200 p-8 space-y-6 text-center">
    <div class="text-4xl font-bold text-slate-900">{{ title }}</div>
    <div class="text-3xl text-slate-500">{{ message }}</div>
    <button
      type="button"
      class="w-full rounded-2xl bg-slate-900 text-white py-8 text-3xl font-bold active:scale-[0.99]"
      @click="goHome"
    >返回首页</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGuideStore } from '../stores/guide'
import { useContentStore } from '../stores/content'

defineProps<{
  title?: string
  message?: string
}>()

const router = useRouter()
const guideStore = useGuideStore()
const contentStore = useContentStore()

async function goHome() {
  guideStore.$reset()
  contentStore.reset()
  await router.push('/home')
}
</script>
