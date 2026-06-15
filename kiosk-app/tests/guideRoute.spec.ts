import { describe, expect, it } from 'vitest'
import {
  buildListScopeKey,
  extractQueryString,
  getGuideCode,
  isInvalidPageQuery,
  isValidGuideCode,
  isValidItemId,
  parsePageQuery,
  resolveItemListContext,
  resolveItemTypeContext,
} from '../src/utils/guideRoute'

describe('guideRoute utils', () => {
  it('validates guide codes', () => {
    expect(isValidGuideCode('D-001')).toBe(true)
    expect(isValidGuideCode('')).toBe(false)
    expect(isValidGuideCode('bad code')).toBe(false)
  })

  it('validates item ids', () => {
    expect(isValidItemId('i-001')).toBe(true)
    expect(isValidItemId('../hack')).toBe(false)
  })

  it('rejects array query values', () => {
    expect(extractQueryString(['D-001', 'D-002'])).toBeUndefined()
    expect(isValidGuideCode(['D-001'])).toBe(true)
    expect(isValidGuideCode(['D-001', 'D-002'])).toBe(false)
  })

  it('rejects object and oversized values', () => {
    expect(extractQueryString({ code: 'D-001' })).toBeUndefined()
    expect(isValidGuideCode('x'.repeat(51))).toBe(false)
  })

  it('parsePageQuery 仅接受完整正整数字符串', () => {
    expect(parsePageQuery('2')).toBe(2)
    expect(parsePageQuery('9999')).toBe(9999)
    expect(parsePageQuery('0')).toBe(1)
    expect(parsePageQuery('-1')).toBe(1)
    expect(parsePageQuery('abc')).toBe(1)
    expect(parsePageQuery('2abc')).toBe(1)
    expect(parsePageQuery('1.5')).toBe(1)
    expect(parsePageQuery('+2')).toBe(1)
    expect(parsePageQuery('10000')).toBe(1)
    expect(parsePageQuery(['3'])).toBe(3)
    expect(parsePageQuery(['2', '3'])).toBe(1)
  })

  it('isInvalidPageQuery 识别非法 page 语法', () => {
    expect(isInvalidPageQuery(undefined)).toBe(false)
    expect(isInvalidPageQuery('2')).toBe(false)
    expect(isInvalidPageQuery('9999')).toBe(false)
    expect(isInvalidPageQuery('2abc')).toBe(true)
    expect(isInvalidPageQuery('1.5')).toBe(true)
    expect(isInvalidPageQuery('+2')).toBe(true)
    expect(isInvalidPageQuery('0')).toBe(true)
    expect(isInvalidPageQuery('-1')).toBe(true)
    expect(isInvalidPageQuery('10000')).toBe(true)
  })

  it('resolves item type context exclusively', () => {
    expect(resolveItemTypeContext({ deptCode: 'D-001' })).toBe('dept')
    expect(resolveItemTypeContext({ themeCode: 'T-001' })).toBe('theme')
    expect(resolveItemTypeContext({})).toBeNull()
    expect(resolveItemTypeContext({ deptCode: 'D-001', themeCode: 'T-001' })).toBeNull()
  })

  it('resolves item list context requires itemTypeCode', () => {
    expect(resolveItemListContext({ deptCode: 'D-001', itemTypeCode: 'query' })).toBe(true)
    expect(resolveItemListContext({ deptCode: 'D-001' })).toBe(false)
    expect(resolveItemListContext({
      deptCode: 'D-001',
      themeCode: 'T-001',
      itemTypeCode: 'query',
    })).toBe(false)
  })

  it('builds list scope key', () => {
    expect(buildListScopeKey({ deptCode: 'D-001', itemTypeCode: 'query' })).toBe('dept:D-001:query')
    expect(buildListScopeKey({ themeCode: 'T-001', itemTypeCode: 'apply' })).toBe('theme:T-001:apply')
  })

  it('getGuideCode returns validated code only', () => {
    expect(getGuideCode(' D-001 ')).toBe('D-001')
    expect(getGuideCode(['D-001'])).toBe('D-001')
    expect(getGuideCode(['a', 'b'])).toBeUndefined()
  })
})
