import {
  deserializeRelatedIds,
  normalizeRelatedIdsForResponse,
  serializeRelatedIds,
} from '../src/guide-config/utils/related-ids.util';

const POLICY_A = '11111111-1111-4111-8111-111111111111';
const POLICY_B = '22222222-2222-4222-8222-222222222222';

describe('related-ids.util', () => {
  it('serializeRelatedIds 去重并稳定排序', () => {
    expect(serializeRelatedIds([POLICY_B, POLICY_A, POLICY_B])).toBe(
      JSON.stringify([POLICY_A, POLICY_B].sort()),
    );
  });

  it('重复 ID 不因 ArrayUnique 拒绝，由序列化层去重', () => {
    const result = serializeRelatedIds([POLICY_A, POLICY_A, POLICY_B, POLICY_B]);
    expect(JSON.parse(result!)).toEqual([POLICY_A, POLICY_B].sort());
  });

  it('空数组或 undefined 序列化为 null', () => {
    expect(serializeRelatedIds([])).toBeNull();
    expect(serializeRelatedIds(undefined)).toBeNull();
  });

  it('deserializeRelatedIds 还原 JSON 数组', () => {
    const text = serializeRelatedIds([POLICY_A, POLICY_B])!;
    expect(deserializeRelatedIds(text)).toEqual([POLICY_A, POLICY_B].sort());
  });

  it('normalizeRelatedIdsForResponse 处理 null', () => {
    expect(normalizeRelatedIdsForResponse(null)).toEqual([]);
  });
});
