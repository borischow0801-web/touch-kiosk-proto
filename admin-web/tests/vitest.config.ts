import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

export default defineConfig({
  plugins: [vue()],
  root,
  cacheDir: resolve(__dirname, '.vitest-cache'),
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    setupFiles: [resolve(__dirname, 'setup.ts')],
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': resolve(root, 'src'),
    },
    dedupe: ['vue', 'pinia', 'vue-router', 'element-plus'],
  },
})
