<template>
  <button
    type="button"
    class="home-hot-card liquid-glass home-enter home-layout-xl"
    :style="{ animationDelay: '0ms' }"
    @click="emit('click')"
  >
    <span class="home-hot-card__glow" aria-hidden="true" />
    <span class="home-hot-card__label">高频事项</span>
    <span class="home-hot-card__name">{{ item.name }}</span>
  </button>
</template>

<script setup lang="ts">
import type { HotItem } from '../../api/types'

defineProps<{ item: HotItem }>()
const emit = defineEmits<{ click: [] }>()
</script>

<style scoped>
.home-hot-card {
  width: 100%;
  min-height: var(--kiosk-card-height-xl);
  padding: var(--kiosk-space-xl);
  text-align: left;
  cursor: pointer;
  border-left: 5px solid var(--kiosk-color-horizon);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(220, 238, 255, 0.72) 100%
  );
}

.home-hot-card__glow {
  position: absolute;
  top: -20%;
  right: -5%;
  width: 40%;
  height: 80%;
  background: radial-gradient(circle, rgba(91, 164, 232, 0.12) 0%, transparent 70%);
  pointer-events: none;
}

.home-hot-card__label {
  position: relative;
  z-index: 1;
  display: block;
  font-size: var(--kiosk-font-caption);
  color: var(--kiosk-color-horizon);
  font-weight: 600;
  margin-bottom: var(--kiosk-space-xs);
}

.home-hot-card__name {
  position: relative;
  z-index: 1;
  display: block;
  font-size: var(--kiosk-font-h1);
  font-weight: 700;
  color: var(--kiosk-color-ink);
  line-height: 1.2;
}
</style>
