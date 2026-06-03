<template>
  <nav class="shrink-0 bg-white border-t border-slate-200" style="height:60px;">
    <div class="h-full grid grid-cols-4">
      <button v-for="(it, idx) in items" :key="idx"
        class="text-3xl font-semibold text-slate-800 active:scale-[0.99]"
        @click="go(it.to)">
        {{ it.label }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { NavItem } from '../api/types'
defineProps<{ items: NavItem[] }>()
const router = useRouter()
function go(to: string) { if (to === 'BACK') router.back(); else router.push(to) }
</script>
