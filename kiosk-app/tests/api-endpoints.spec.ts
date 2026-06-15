import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const endpointsSrc = readFileSync(resolve(__dirname, '../src/api/endpoints.ts'), 'utf8')

describe('API endpoints security', () => {
  it('办事指南接口仅调用 /api/public/service-guide', () => {
    expect(endpointsSrc).toContain('/api/public/service-guide/depts')
    expect(endpointsSrc).toContain('/api/public/service-guide/themes')
    expect(endpointsSrc).toContain('/api/public/service-guide/items')
    expect(endpointsSrc).not.toMatch(/\/api\/admin\//)
  })

  it('政务公开接口仅调用 /api/public/content', () => {
    expect(endpointsSrc).toContain('/api/public/content/')
    expect(endpointsSrc).not.toMatch(/\/api\/admin\//)
  })

  it('不直接调用共享平台地址', () => {
    expect(endpointsSrc).not.toMatch(/https?:\/\//)
  })

  it('政务公开 API 使用动态 apiSegment 参数', () => {
    expect(endpointsSrc).toContain('/api/public/content/${encodeURIComponent(apiSegment)}')
    expect(endpointsSrc).toContain('getPublicContentList')
    expect(endpointsSrc).toContain('getPublicContentDetail')
  })
})
