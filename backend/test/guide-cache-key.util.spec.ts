import { buildCacheKey, CACHE_KEY_DIGEST_LENGTH, serializeRequestParam } from '../src/service-guide/cache/guide-cache-key.util';

describe('guide-cache-key.util', () => {
  it('sorts parameter keys for stable cache_key digest', () => {
    const keyA = buildCacheKey('item_list', { themeCode: 'T-001', deptCode: 'D-001', page: 1 });
    const keyB = buildCacheKey('item_list', { page: 1, deptCode: 'D-001', themeCode: 'T-001' });
    expect(keyA).toBe(keyB);
  });

  it('uses fixed-length sha256 digest', () => {
    const key = buildCacheKey('item_detail', { itemId: 'i-001' });
    expect(key).toMatch(/^item_detail:[a-f0-9]{64}$/);
    expect(key.split(':')[1]).toHaveLength(CACHE_KEY_DIGEST_LENGTH);
  });

  it('omits undefined parameters from serialized request_param', () => {
    const serialized = serializeRequestParam({ page: 1, pageSize: 20, deptCode: undefined });
    expect(serialized).toBe('{"page":1,"pageSize":20}');
  });

  it('keeps full serialized params separate from digest key', () => {
    const params = { itemId: 'i-001' };
    const serialized = serializeRequestParam(params);
    const key = buildCacheKey('item_detail', params);
    expect(serialized).toBe('{"itemId":"i-001"}');
    expect(key.startsWith('item_detail:')).toBe(true);
    expect(key).not.toContain('i-001');
  });
});
