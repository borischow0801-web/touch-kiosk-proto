/** Stable JSON-array text format for related content ID lists (not DB JSON type). */
const EMPTY_ARRAY_TEXT = '[]';

export function serializeRelatedIds(ids: string[] | null | undefined): string | null {
  if (ids == null || ids.length === 0) {
    return null;
  }
  const uniqueSorted = [...new Set(ids)].sort();
  return JSON.stringify(uniqueSorted);
}

export function deserializeRelatedIds(text: string | null | undefined): string[] {
  if (text == null || text === '') {
    return [];
  }
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid related IDs text format');
  }
  return parsed as string[];
}

export function normalizeRelatedIdsForResponse(text: string | null | undefined): string[] {
  try {
    return deserializeRelatedIds(text);
  } catch {
    return [];
  }
}

export { EMPTY_ARRAY_TEXT };
