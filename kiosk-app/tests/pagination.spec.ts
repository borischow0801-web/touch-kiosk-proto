import { describe, expect, it } from 'vitest'

function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

describe('分页边界', () => {
  it('total=0 时至少 1 页', () => {
    expect(totalPages(0, 10)).toBe(1)
  })

  it('total=25 pageSize=10 共 3 页', () => {
    expect(totalPages(25, 10)).toBe(3)
  })

  it('恰满一页无下一页', () => {
    expect(totalPages(10, 10)).toBe(1)
  })
})
