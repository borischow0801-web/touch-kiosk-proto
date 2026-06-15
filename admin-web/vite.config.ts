import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  cacheDir: resolve(__dirname, '.vite'),
  server: {
    host: true,
    port: 5184,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
})
