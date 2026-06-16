<template>
  <div class="home-module-grid">
    <HomeModuleCard
      v-for="(mod, idx) in modules"
      :key="mod.moduleCode"
      :module="mod"
      :index="idx"
      :total="modules.length"
      @click="emit('select', mod)"
    />
  </div>
</template>

<script setup lang="ts">
import type { PublicHomeModule } from '../../api/types'
import HomeModuleCard from './HomeModuleCard.vue'

defineProps<{ modules: PublicHomeModule[] }>()
const emit = defineEmits<{ select: [PublicHomeModule] }>()
</script>
