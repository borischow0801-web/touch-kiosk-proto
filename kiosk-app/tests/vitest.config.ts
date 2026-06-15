import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

export default defineConfig({
  plugins: [vue()],
  root,
  cacheDir: resolve(__dirname, '.vitest-cache'),
  css: {
    postcss: resolve(__dirname, 'postcss.config.cjs'),
  },
  server: {
    fs: { allow: [root] },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    setupFiles: [resolve(__dirname, 'setup.ts')],
    pool: 'forks',
  },
  resolve: {
    dedupe: ['vue', 'pinia', 'vue-router', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity'],
    alias: {
      vue: resolve(root, 'node_modules/vue/dist/vue.runtime.esm-bundler.js'),
      pinia: resolve(root, 'node_modules/pinia/dist/pinia.mjs'),
      'vue-router': resolve(root, 'node_modules/vue-router/dist/vue-router.mjs'),
    },
  },
})
