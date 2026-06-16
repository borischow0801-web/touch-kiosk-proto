<template>
  <button
    type="button"
    class="home-module-card liquid-glass home-enter"
    :class="[
      layoutClass,
      { 'honor-banner': honor, 'home-module-card--honor': honor },
    ]"
    :style="cardStyle"
    @click="emit('click')"
  >
    <span class="home-module-card__accent" :style="{ background: accentColor }" aria-hidden="true" />
    <div class="home-module-card__inner">
      <span v-if="honor" class="honor-banner__badge">荣誉展示</span>
      <span class="home-module-card__title">{{ module.moduleName }}</span>
      <span v-if="subtitle" class="home-module-card__subtitle">{{ subtitle }}</span>
    </div>
    <span v-if="!honor" class="home-module-card__chevron" aria-hidden="true">›</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PublicHomeModule } from '../../api/types'
import {
  isHonorModule,
  layoutGridClass,
  moduleAccentColor,
  moduleCardHeightPx,
  moduleSubtitle,
  resolveModuleDisplayLayout,
} from '../../utils/homeModuleLayout'

const props = defineProps<{
  module: PublicHomeModule
  index?: number
  total?: number
}>()

const emit = defineEmits<{ click: [] }>()

const display = computed(() =>
  resolveModuleDisplayLayout(
    props.module,
    props.index ?? 0,
    props.total ?? 1,
  ),
)

const layoutClass = computed(() => layoutGridClass(display.value.layout))
const honor = computed(() => isHonorModule(props.module))
const subtitle = computed(() => moduleSubtitle(props.module))
const accentColor = computed(() => moduleAccentColor(props.module))

const cardStyle = computed(() => ({
  minHeight: `${moduleCardHeightPx(display.value.layout)}px`,
  gridColumn: `span ${display.value.gridColumnSpan}`,
  animationDelay: props.index != null ? `${Math.min(props.index * 40, 240)}ms` : undefined,
}))
</script>

<style scoped>
.home-module-card {
  width: 100%;
  min-height: var(--kiosk-touch-min);
  padding: var(--kiosk-space-lg) var(--kiosk-space-lg) var(--kiosk-space-lg) calc(var(--kiosk-space-lg) + 6px);
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-md);
}

.home-module-card__accent {
  position: absolute;
  left: 0;
  top: 18%;
  bottom: 18%;
  width: 5px;
  border-radius: 0 4px 4px 0;
  opacity: 0.85;
}

.home-module-card__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--kiosk-space-xs);
  flex: 1;
  min-width: 0;
}

.home-module-card__title {
  font-size: var(--kiosk-font-h2);
  font-weight: 700;
  color: var(--kiosk-color-ink);
  line-height: 1.2;
}

.home-module-card__subtitle {
  font-size: var(--kiosk-font-caption);
  color: var(--kiosk-color-mist);
}

.home-module-card__chevron {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  font-size: 2.5rem;
  line-height: 1;
  color: var(--kiosk-color-horizon);
  opacity: 0.55;
  font-weight: 300;
}

.home-module-card--honor {
  padding-left: calc(var(--kiosk-space-lg) + 8px);
}

.home-module-card--honor .home-module-card__title {
  font-size: var(--kiosk-font-h1);
}
</style>
