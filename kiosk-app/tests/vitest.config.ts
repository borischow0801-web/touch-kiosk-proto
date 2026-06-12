import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  root: resolve(__dirname, '..'),
  cacheDir: resolve(__dirname, '.vitest-cache'),
  server: {
    fs: { allow: [resolve(__dirname, '..')] },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
  },
})
