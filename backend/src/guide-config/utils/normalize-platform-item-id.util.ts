/**
 * Trims platform item ID for storage and uniqueness checks.
 */
export function normalizePlatformItemId(platformItemId: string): string {
  return platformItemId.trim();
}
