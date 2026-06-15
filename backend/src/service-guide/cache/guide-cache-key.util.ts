import { createHash } from 'crypto';
import type { ServiceGuideApiName } from '../constants/service-guide.constants';

/** Stable cache key generation — parameter key order must not affect cache_key. */

export function sortParamKeys(params: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === undefined) continue;
    sorted[key] = value;
  }
  return sorted;
}

export function serializeRequestParam(params: Record<string, unknown>): string {
  return JSON.stringify(sortParamKeys(params));
}

/** Fixed-length cache key: apiName + SHA-256 digest of sorted params. */
export function buildCacheKey(apiName: ServiceGuideApiName | string, params: Record<string, unknown>): string {
  const normalized = serializeRequestParam(params);
  const digest = createHash('sha256').update(normalized, 'utf8').digest('hex');
  return `${apiName}:${digest}`;
}

export const CACHE_KEY_DIGEST_LENGTH = 64;
