import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(here, '..')

for (const pkg of ['vue', 'pinia', 'vue-router']) {
  if (!existsSync(resolve(appRoot, 'node_modules', pkg))) {
    console.error(`缺少 kiosk-app/node_modules/${pkg}`)
    console.error('干净环境请先执行：')
    console.error('  cd kiosk-app && npm install')
    console.error('  cd tests && npm install')
    process.exit(1)
  }
}
