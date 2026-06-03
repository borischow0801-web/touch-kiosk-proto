<template>
  <button class="w-full rounded-2xl bg-white shadow-sm border border-slate-200 active:scale-[0.99] px-6"
    :style="{ height: (heightPx ?? 160) + 'px' }"
    @click="$emit('click')">
    <div class="text-left">
      <div class="text-4xl font-bold text-slate-900">{{ title }}</div>
      <div v-if="subtitle" class="text-3xl text-slate-500 mt-2">{{ subtitle }}</div>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; heightPx?: number }>()
defineEmits<{ (e: 'click'): void }>()
</script>
