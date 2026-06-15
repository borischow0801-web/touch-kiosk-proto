<template>
  <nav class="shrink-0 bg-white border-t border-slate-200" style="height:60px;">
    <div class="h-full grid grid-cols-4">
      <button
        v-for="(it, idx) in items"
        :key="idx"
        type="button"
        class="text-3xl font-semibold text-slate-800 active:scale-[0.99]"
        @click="go(it.to)"
      >
        {{ it.label }}
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { NavItem } from '../api/types'
import { useBottomNavActions } from '../app/useBottomNav'

defineProps<{ items: NavItem[] }>()
const { goNav } = useBottomNavActions()

function go(to: string) {
  void goNav(to)
}
</script>
