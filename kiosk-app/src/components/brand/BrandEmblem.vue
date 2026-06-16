<template>
  <img
    class="brand-emblem"
    :src="TRI_COLOR_EMBLEM_SRC"
    alt="政务公开标志"
    draggable="false"
  />
</template>

<script setup lang="ts">
import { TRI_COLOR_EMBLEM_SRC } from '../../constants/brandAssets'
</script>

<style scoped>
.brand-emblem {
  display: block;
  width: 112px;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(30, 80, 140, 0.12));
}
</style>
