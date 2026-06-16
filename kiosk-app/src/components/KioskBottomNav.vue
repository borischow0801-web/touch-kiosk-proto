<template>
  <nav class="kiosk-bottom-nav shrink-0" style="height: var(--kiosk-nav-height);">
    <div class="kiosk-bottom-nav__inner">
      <button
        v-for="(it, idx) in items"
        :key="idx"
        type="button"
        class="kiosk-bottom-nav__btn"
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

<style scoped>
.kiosk-bottom-nav {
  background: var(--kiosk-color-glass);
  backdrop-filter: blur(var(--kiosk-blur-glass));
  -webkit-backdrop-filter: blur(var(--kiosk-blur-glass));
  border-top: 1px solid var(--kiosk-color-glass-border);
}

.kiosk-bottom-nav__inner {
  height: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.kiosk-bottom-nav__btn {
  min-height: var(--kiosk-touch-min);
  font-size: var(--kiosk-font-nav);
  font-weight: 600;
  color: var(--kiosk-color-ink);
  transition: transform 120ms ease, background 120ms ease;
}

.kiosk-bottom-nav__btn:active {
  transform: scale(0.98);
  background: rgba(91, 164, 232, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .kiosk-bottom-nav__btn:active {
    transform: none;
  }
}
</style>
