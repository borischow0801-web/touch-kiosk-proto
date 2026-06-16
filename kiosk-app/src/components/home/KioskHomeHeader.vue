<template>
  <header class="kiosk-home-header">
    <div class="kiosk-home-header__backdrop" aria-hidden="true">
      <div class="kiosk-home-header__sky" />
      <div class="kiosk-home-header__cloud kiosk-home-header__cloud--a" />
      <div class="kiosk-home-header__cloud kiosk-home-header__cloud--b" />
      <div class="kiosk-home-header__cloud kiosk-home-header__cloud--c" />
      <div class="kiosk-home-header__sea" />
      <div class="kiosk-home-header__horizon" />
      <div class="kiosk-home-header__waves" />
      <div class="kiosk-home-header__gate-scene">
        <div class="kiosk-home-header__gate-outer" />
        <div class="kiosk-home-header__gate-inner" />
        <div class="kiosk-home-header__gate-pillar kiosk-home-header__gate-pillar--l" />
        <div class="kiosk-home-header__gate-pillar kiosk-home-header__gate-pillar--r" />
        <div class="kiosk-home-header__gate-beam" />
        <div class="kiosk-home-header__gate-reflection" />
      </div>
    </div>

    <div class="kiosk-home-header__bar">
      <div class="kiosk-home-header__brand">
        <BrandEmblem class="kiosk-home-header__logo" />
        <div class="kiosk-home-header__titles">
          <h1 class="kiosk-home-header__title">{{ title }}</h1>
          <p v-if="subtitle" class="kiosk-home-header__subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <p v-if="clock" class="kiosk-home-header__clock">{{ clock }}</p>
    </div>

    <div v-if="bannerLines?.length" class="kiosk-home-header__banner">
      <p v-for="(line, idx) in bannerLines" :key="idx">{{ line }}</p>
    </div>
  </header>
</template>

<script setup lang="ts">
import BrandEmblem from '../brand/BrandEmblem.vue'

defineProps<{
  title: string
  subtitle?: string | null
  bannerLines?: string[]
  clock?: string
}>()
</script>

<style scoped>
.kiosk-home-header {
  position: relative;
  height: 29vh;
  min-height: 300px;
  overflow: hidden;
  flex-shrink: 0;
}

.kiosk-home-header__backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.kiosk-home-header__sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--kiosk-color-sky-deep, #b8dcff) 0%,
    var(--kiosk-color-sky-start) 28%,
    var(--kiosk-color-sky-end) 68%
  );
}

.kiosk-home-header__cloud {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow:
    32px 8px 0 -4px rgba(255, 255, 255, 0.45),
    -24px 12px 0 -6px rgba(255, 255, 255, 0.35);
}

.kiosk-home-header__cloud--a {
  width: 200px;
  height: 52px;
  top: 14%;
  left: 6%;
  opacity: 0.85;
}

.kiosk-home-header__cloud--b {
  width: 160px;
  height: 44px;
  top: 22%;
  right: 10%;
  opacity: 0.75;
}

.kiosk-home-header__cloud--c {
  width: 120px;
  height: 36px;
  top: 8%;
  right: 28%;
  opacity: 0.55;
}

@media (prefers-reduced-motion: no-preference) {
  .kiosk-home-header__cloud--a {
    animation: cloud-drift 20s ease-in-out infinite alternate;
  }
  .kiosk-home-header__cloud--b {
    animation: cloud-drift 26s ease-in-out infinite alternate-reverse;
  }
  .kiosk-home-header__cloud--c {
    animation: cloud-drift 22s ease-in-out infinite alternate;
  }

  @keyframes cloud-drift {
    from { transform: translateX(0); }
    to { transform: translateX(14px); }
  }
}

.kiosk-home-header__sea {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38%;
  background: linear-gradient(
    180deg,
    rgba(184, 220, 255, 0.15) 0%,
    rgba(91, 164, 232, 0.22) 55%,
    rgba(74, 148, 220, 0.28) 100%
  );
}

.kiosk-home-header__horizon {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 36%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(91, 164, 232, 0.35) 20%,
    var(--kiosk-color-horizon) 50%,
    rgba(91, 164, 232, 0.35) 80%,
    transparent 100%
  );
  box-shadow: 0 1px 8px rgba(91, 164, 232, 0.25);
}

.kiosk-home-header__waves {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12%;
  height: 24px;
  opacity: 0.35;
  background:
    radial-gradient(ellipse 40px 8px at 20% 50%, rgba(255, 255, 255, 0.5) 0%, transparent 70%),
    radial-gradient(ellipse 50px 10px at 55% 60%, rgba(255, 255, 255, 0.4) 0%, transparent 70%),
    radial-gradient(ellipse 36px 8px at 85% 45%, rgba(255, 255, 255, 0.45) 0%, transparent 70%);
}

@media (prefers-reduced-motion: no-preference) {
  .kiosk-home-header__waves {
    animation: wave-shimmer 8s ease-in-out infinite alternate;
  }

  @keyframes wave-shimmer {
    from { transform: translateX(-4px); }
    to { transform: translateX(4px); }
  }
}

.kiosk-home-header__gate-scene {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, 72vw);
  height: 72%;
  pointer-events: none;
}

.kiosk-home-header__gate-outer {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 88%;
  border: 5px solid rgba(255, 255, 255, 0.72);
  border-bottom: none;
  border-radius: 210px 210px 0 0;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.42) 0%,
    rgba(255, 255, 255, 0.12) 45%,
    transparent 85%
  );
  box-shadow:
    inset 0 0 40px rgba(255, 255, 255, 0.35),
    0 0 24px rgba(91, 164, 232, 0.12);
}

.kiosk-home-header__gate-inner {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 72%;
  height: 68%;
  border: 3px solid rgba(91, 164, 232, 0.38);
  border-bottom: none;
  border-radius: 150px 150px 0 0;
  background: linear-gradient(180deg, rgba(234, 244, 255, 0.25) 0%, transparent 70%);
}

.kiosk-home-header__gate-pillar {
  position: absolute;
  bottom: 0;
  width: 14px;
  height: 55%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(200, 224, 248, 0.55) 100%
  );
  border-radius: 4px 4px 0 0;
  box-shadow: inset -2px 0 4px rgba(91, 164, 232, 0.15);
}

.kiosk-home-header__gate-pillar--l {
  left: 8%;
}

.kiosk-home-header__gate-pillar--r {
  right: 8%;
}

.kiosk-home-header__gate-beam {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  width: 86%;
  height: 6px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.9),
    transparent
  );
  border-radius: 3px;
  opacity: 0.75;
}

.kiosk-home-header__gate-reflection {
  position: absolute;
  bottom: -8%;
  left: 50%;
  transform: translateX(-50%) scaleY(-0.35);
  width: 90%;
  height: 40%;
  border: 3px solid rgba(91, 164, 232, 0.12);
  border-bottom: none;
  border-radius: 180px 180px 0 0;
  opacity: 0.45;
  filter: blur(1px);
}

.kiosk-home-header__bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--kiosk-space-lg);
  padding: var(--kiosk-space-lg) var(--kiosk-space-xl) var(--kiosk-space-sm);
}

.kiosk-home-header__brand {
  display: flex;
  align-items: center;
  gap: var(--kiosk-space-lg);
  min-width: 0;
}

.kiosk-home-header__logo {
  flex-shrink: 0;
}

.kiosk-home-header__titles {
  min-width: 0;
  text-align: left;
}

.kiosk-home-header__title {
  font-size: var(--kiosk-font-h0);
  font-weight: 700;
  color: var(--kiosk-color-ink);
  line-height: 1.15;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}

.kiosk-home-header__subtitle {
  margin-top: var(--kiosk-space-xs);
  font-size: var(--kiosk-font-h3);
  color: var(--kiosk-color-mist);
  line-height: 1.3;
}

.kiosk-home-header__clock {
  flex-shrink: 0;
  font-size: var(--kiosk-font-caption);
  color: var(--kiosk-color-horizon);
  font-weight: 600;
  padding-top: var(--kiosk-space-xs);
}

.kiosk-home-header__banner {
  position: relative;
  z-index: 2;
  padding: 0 var(--kiosk-space-xl) var(--kiosk-space-md);
  font-size: var(--kiosk-font-caption);
  color: var(--kiosk-color-mist);
  line-height: 1.45;
  text-align: center;
}
</style>
