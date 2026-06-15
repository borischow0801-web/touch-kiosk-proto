import { describe, expect, it } from 'vitest'
import { isValidJsonText, isUuidV4 } from '@/utils/guideForm'

describe('办事指南表单工具', () => {
  it('isValidJsonText 接受合法 JSON', () => {
    expect(isValidJsonText('{"a":1}')).toBe(true)
    expect(isValidJsonText('')).toBe(true)
    expect(isValidJsonText('   ')).toBe(true)
  })

  it('isValidJsonText 拒绝非法 JSON', () => {
    expect(isValidJsonText('{bad}')).toBe(false)
    expect(isValidJsonText('not json')).toBe(false)
  })

  it('isUuidV4 校验 UUID v4', () => {
    expect(isUuidV4('11111111-1111-4111-8111-111111111111')).toBe(true)
    expect(isUuidV4('11111111-1111-1111-1111-111111111111')).toBe(false)
    expect(isUuidV4('')).toBe(false)
  })
})
