import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  cacheDir: resolve(__dirname, '.vite'),
  server: { 
    host: true,
    port: 5183,
    strictPort: true,
    proxy: { 
      '/api': 'http://localhost:3100'
    }
  }
})
