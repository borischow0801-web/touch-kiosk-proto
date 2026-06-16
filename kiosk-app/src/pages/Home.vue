<template>
  <div class="kiosk-home-stack">
    <div v-if="hotItems.length" class="home-module-grid">
      <HomeHotItemCard
        v-for="it in hotItems"
        :key="it.itemId"
        :item="it"
        @click="openItem(it.itemId)"
      />
    </div>

    <HomeModuleGrid
      v-if="modules.length"
      :modules="modules"
      @select="onModuleClick"
    />

    <div v-if="notices.length" class="home-notices">
      <div class="home-notices__title">通知公告</div>
      <div class="home-module-grid">
        <button
          v-for="(notice, idx) in notices"
          :key="notice.id"
          type="button"
          class="home-notice-card liquid-glass home-enter home-layout-full"
          :style="{ animationDelay: `${idx * 40}ms` }"
          @click="openNotice(notice.id)"
        >
          <span class="home-notice-card__title">{{ notice.title }}</span>
          <span v-if="notice.summary" class="home-notice-card__summary">{{ notice.summary }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import HomeHotItemCard from '../components/home/HomeHotItemCard.vue'
import HomeModuleGrid from '../components/home/HomeModuleGrid.vue'
import type { PublicHomeModule } from '../api/types'
import { useHomeConfigStore } from '../stores/homeConfig'
import { navigateHomeModule } from '../utils/homeModuleNav'

const router = useRouter()
const homeConfig = useHomeConfigStore()
const navigating = ref(false)

const hotItems = computed(() => homeConfig.effectiveConfig.homeHotItems)
const modules = computed(() => homeConfig.effectiveConfig.modules)
const notices = computed(() => homeConfig.effectiveConfig.noticeSummaries)

function openItem(itemId: string) {
  void router.push(`/items/${itemId}`)
}

function openNotice(id: string) {
  void router.push(`/content/notices/${encodeURIComponent(id)}`)
}

async function onModuleClick(mod: PublicHomeModule) {
  if (navigating.value) return
  navigating.value = true
  try {
    await navigateHomeModule(router, mod)
  } finally {
    navigating.value = false
  }
}
</script>

<style scoped>
.home-notices__title {
  font-size: var(--kiosk-font-h2);
  font-weight: 700;
  color: var(--kiosk-color-ink);
  margin-bottom: var(--kiosk-space-md);
}

.home-notice-card {
  width: 100%;
  min-height: var(--kiosk-card-height-m);
  padding: var(--kiosk-space-lg);
  text-align: left;
  cursor: pointer;
}

.home-notice-card__title {
  display: block;
  font-size: var(--kiosk-font-h3);
  font-weight: 600;
  color: var(--kiosk-color-ink);
}

.home-notice-card__summary {
  display: block;
  margin-top: var(--kiosk-space-xs);
  font-size: var(--kiosk-font-caption);
  color: var(--kiosk-color-mist);
}
</style>
