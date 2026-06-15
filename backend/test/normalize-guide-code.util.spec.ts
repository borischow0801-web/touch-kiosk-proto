import { normalizeGuideCode } from '../src/guide-config/utils/normalize-guide-code.util';

describe('normalizeGuideCode', () => {
  it('trim 并转为大写', () => {
    expect(normalizeGuideCode(' code_a ')).toBe('CODE_A');
    expect(normalizeGuideCode('KbQy')).toBe('KBQY');
  });

  it('相同语义编码归一化结果一致', () => {
    expect(normalizeGuideCode('CODE_A')).toBe(normalizeGuideCode(' code_a '));
    expect(normalizeGuideCode('ScJgJ')).toBe(normalizeGuideCode(' scjgj '));
  });
});
