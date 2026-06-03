<template>
  <button class="w-full rounded-2xl bg-white border border-slate-200 shadow-sm px-6 py-5 active:scale-[0.99]"
    style="min-height:160px;"
    @click="$emit('click')">
    <div class="text-left">
      <div class="text-4xl font-bold text-slate-900">{{ title }}</div>
      <div v-if="meta" class="text-3xl text-slate-500 mt-2">{{ meta }}</div>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{ title: string; meta?: string }>()
defineEmits<{ (e: 'click'): void }>()
</script>
