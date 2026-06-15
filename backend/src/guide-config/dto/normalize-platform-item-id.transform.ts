import { Transform } from 'class-transformer';
import { normalizePlatformItemId } from '../utils/normalize-platform-item-id.util';

export function NormalizePlatformItemId() {
  return Transform(({ value }) =>
    typeof value === 'string' ? normalizePlatformItemId(value) : value,
  );
}
