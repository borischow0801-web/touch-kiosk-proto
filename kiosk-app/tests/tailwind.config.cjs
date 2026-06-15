const path = require('node:path')

const appRoot = path.join(__dirname, '..')

/** 仅 Vitest 使用：content 使用绝对路径，避免 cwd 为 tests/ 时扫描不到 src */
module.exports = {
  content: [
    path.join(appRoot, 'index.html'),
    path.join(appRoot, 'src/**/*.{vue,ts,tsx}'),
  ],
  theme: { extend: {} },
  plugins: [],
}
