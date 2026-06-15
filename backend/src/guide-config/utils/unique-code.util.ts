import { QueryFailedError } from 'typeorm';

const UNIQUE_INDEX_BY_KIND = {
  dept: 'uk_guide_dept_mapping_dept_code',
  theme: 'uk_guide_theme_mapping_theme_code',
  platformItem: 'uk_guide_item_config_platform_item_id',
} as const;

export type GuideUniqueKind = keyof typeof UNIQUE_INDEX_BY_KIND;

export function isGuideUniqueViolation(error: unknown, kind: GuideUniqueKind): boolean {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError = error.driverError as { code?: string; errno?: number } | undefined;
  if (driverError?.errno === 1062 || driverError?.code === '23505') {
    return true;
  }

  const indexName = UNIQUE_INDEX_BY_KIND[kind];
  const message = `${error.message} ${String(driverError)}`;
  return message.includes(indexName);
}

/** @deprecated Use isGuideUniqueViolation */
export function isUniqueCodeViolation(error: unknown, kind: 'dept' | 'theme'): boolean {
  return isGuideUniqueViolation(error, kind);
}

