/**
 * Normalizes guide dept/theme codes for storage and uniqueness checks.
 * trim + uppercase ensures consistent behavior across MySQL 8 and HighGo.
 */
export function normalizeGuideCode(code: string): string {
  return code.trim().toUpperCase();
}
