import { describe, expect, it } from 'vitest'
import { displayOrEmpty, formatPublishAt } from '../src/utils/formatContent'

describe('formatContent', () => {
  it('空字段显示暂无相关信息', () => {
    expect(displayOrEmpty(null)).toBe('暂无相关信息')
    expect(displayOrEmpty('  ')).toBe('暂无相关信息')
  })

  it('详情空字段兜底', () => {
    expect(formatPublishAt(null)).toBe('暂无相关信息')
  })
})
