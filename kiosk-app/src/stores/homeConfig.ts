import { defineStore } from 'pinia'
import { getConfig } from '../api/endpoints'
import { OFFLINE_HOME_CONFIG } from '../config/offlineHomeConfig'
import { normalizeAppConfig, shouldUseOfflineFallback } from '../utils/homeConfig'
import type { AppConfig } from '../api/types'

export type HomeConfigSource = 'remote' | 'offline'

export const useHomeConfigStore = defineStore('homeConfig', {
  state: () => ({
    config: null as AppConfig | null,
    source: null as HomeConfigSource | null,
    loading: false,
    loaded: false,
    loadPromise: null as Promise<AppConfig> | null,
  }),

  getters: {
    effectiveConfig(state): AppConfig {
      return state.config ?? OFFLINE_HOME_CONFIG
    },
  },

  actions: {
    ensureLoaded(): Promise<AppConfig> {
      if (this.loaded && this.config) {
        return Promise.resolve(this.config)
      }
      if (this.loadPromise) {
        return this.loadPromise
      }
      this.loadPromise = this.loadInternal()
      return this.loadPromise
    },

    async loadInternal(): Promise<AppConfig> {
      this.loading = true
      try {
        const raw = await getConfig()
        const normalized = normalizeAppConfig(raw)
        if (!normalized) {
          this.config = OFFLINE_HOME_CONFIG
          this.source = 'offline'
        } else {
          this.config = normalized
          this.source = 'remote'
        }
      } catch (error) {
        if (shouldUseOfflineFallback(error)) {
          this.config = OFFLINE_HOME_CONFIG
          this.source = 'offline'
        } else {
          this.config = OFFLINE_HOME_CONFIG
          this.source = 'offline'
        }
      } finally {
        this.loading = false
        this.loaded = true
        this.loadPromise = null
      }
      return this.config!
    },
  },
})
