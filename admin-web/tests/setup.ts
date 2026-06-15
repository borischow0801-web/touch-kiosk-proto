import { beforeEach, vi } from 'vitest'
import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'

config.global.stubs = {
  teleport: true,
  transition: false,
}

/** 全局仅安装一次 Element Plus，避免各测试重复注册插件警告 */
config.global.plugins = [ElementPlus]

beforeEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})
