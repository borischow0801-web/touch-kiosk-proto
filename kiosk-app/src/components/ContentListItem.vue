<template>
  <button
    v-if="interactive"
    type="button"
    class="w-full rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-5 text-left active:scale-[0.99]"
    style="min-height:160px;"
    @click="$emit('activate')"
  >
    <div class="text-4xl font-bold text-slate-900">{{ title }}</div>
    <div v-if="meta" class="text-3xl text-slate-500 mt-2">{{ meta }}</div>
  </button>
  <article
    v-else
    class="w-full rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-5 text-left"
    style="min-height:160px;"
    aria-label="列表内容"
  >
    <div class="text-4xl font-bold text-slate-900">{{ title }}</div>
    <div v-if="meta" class="text-3xl text-slate-500 mt-2">{{ meta }}</div>
    <div v-if="summary" class="text-3xl text-slate-600 mt-4 leading-relaxed">{{ summary }}</div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  meta?: string
  summary?: string
  interactive: boolean
}>()
defineEmits<{ (e: 'activate'): void }>()
</script>
