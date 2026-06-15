import type { ServiceGuideApiName } from '../constants/service-guide.constants';
import { SERVICE_GUIDE_API_NAMES } from '../constants/service-guide.constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isItemTypeArray(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every(
    (entry) =>
      isRecord(entry) && isNonEmptyString(entry.code) && isNonEmptyString(entry.name),
  );
}

function isItemListResult(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value.list) || typeof value.total !== 'number') {
    return false;
  }
  return value.list.every(
    (entry) =>
      isRecord(entry) &&
      isNonEmptyString(entry.itemId) &&
      isNonEmptyString(entry.name) &&
      isNonEmptyString(entry.deptCode) &&
      isNonEmptyString(entry.themeCode),
  );
}

function isItemDetail(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.basicInfo)) return false;
  const basic = value.basicInfo;
  return (
    isNonEmptyString(basic.itemId) &&
    isNonEmptyString(basic.name) &&
    isNonEmptyString(basic.deptName) &&
    Array.isArray(basic.themeNames)
  );
}

/** Validates cached upstream JSON matches the expected API shape. */
export function isValidCachedResponse(apiName: ServiceGuideApiName, parsed: unknown): boolean {
  switch (apiName) {
    case SERVICE_GUIDE_API_NAMES.DEPT_ITEM_TYPES:
    case SERVICE_GUIDE_API_NAMES.THEME_ITEM_TYPES:
      return isItemTypeArray(parsed);
    case SERVICE_GUIDE_API_NAMES.ITEM_LIST:
      return isItemListResult(parsed);
    case SERVICE_GUIDE_API_NAMES.ITEM_DETAIL:
      return isItemDetail(parsed);
    default:
      return false;
  }
}
