import { Transform } from 'class-transformer';
import { normalizeGuideCode } from '../utils/normalize-guide-code.util';

export function NormalizeGuideCode() {
  return Transform(({ value }) =>
    typeof value === 'string' ? normalizeGuideCode(value) : value,
  );
}
