<template>
  <div
    v-if="sanitizedHtml"
    class="text-3xl text-slate-700 mt-4 leading-relaxed selectable safe-body"
    v-html="sanitizedHtml"
  />
  <div v-else class="text-3xl text-slate-400 mt-4 italic">暂无相关信息</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { looksLikeHtml, sanitizePublicBody } from '../utils/sanitizeBody'

const props = defineProps<{ body: string | null | undefined }>()

const sanitizedHtml = computed(() => {
  const raw = props.body?.trim()
  if (!raw) return ''
  if (looksLikeHtml(raw)) {
    return sanitizePublicBody(raw)
  }
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
})
</script>

<style scoped>
.safe-body :deep(a) {
  pointer-events: none;
  color: inherit;
  text-decoration: none;
}
</style>
