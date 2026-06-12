import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function collectVueFiles(dir: string): string[] {
  const files: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      files.push(...collectVueFiles(full))
    } else if (name.endsWith('.vue')) {
      files.push(full)
    }
  }
  return files
}

describe('零键盘约束', () => {
  const srcDir = resolve(__dirname, '../src')
  const vueFiles = collectVueFiles(srcDir)

  it.each(vueFiles)('%s 不含 input/textarea/contenteditable', (file) => {
    const content = readFileSync(file, 'utf8').toLowerCase()
    expect(content).not.toMatch(/<input\b/)
    expect(content).not.toMatch(/<textarea\b/)
    expect(content).not.toMatch(/contenteditable/)
  })
})
