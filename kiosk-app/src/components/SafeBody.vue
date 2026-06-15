<template>
  <div
    v-if="displayHtml"
    class="text-3xl text-slate-700 mt-4 leading-relaxed selectable safe-body"
    v-html="displayHtml"
  />
  <div v-else class="text-3xl text-slate-400 mt-4 italic">暂无相关信息</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  escapeHtmlText,
  isDomParserAvailable,
  looksLikeHtml,
  sanitizePublicBody,
} from '../utils/sanitizeBody'

const props = defineProps<{ body: string | null | undefined }>()

const displayHtml = computed(() => {
  const raw = props.body?.trim()
  if (!raw) return ''

  if (!looksLikeHtml(raw)) {
    return escapeHtmlText(raw).replace(/\n/g, '<br>')
  }

  if (!isDomParserAvailable()) {
    return escapeHtmlText(raw.replace(/<[^>]*>/g, '')).replace(/\n/g, '<br>')
  }

  return sanitizePublicBody(raw)
})
</script>

<style scoped>
.safe-body :deep(*) {
  pointer-events: none;
}
</style>
