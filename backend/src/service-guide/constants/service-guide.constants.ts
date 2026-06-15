export const SERVICE_GUIDE_API_NAMES = {
  DEPT_ITEM_TYPES: 'dept_item_types',
  THEME_ITEM_TYPES: 'theme_item_types',
  ITEM_LIST: 'item_list',
  ITEM_DETAIL: 'item_detail',
} as const;

export type ServiceGuideApiName =
  (typeof SERVICE_GUIDE_API_NAMES)[keyof typeof SERVICE_GUIDE_API_NAMES];

export const SERVICE_GUIDE_PROVIDERS = {
  DEVELOPMENT: 'development',
  REAL: 'real',
} as const;

export type ServiceGuideProviderType =
  (typeof SERVICE_GUIDE_PROVIDERS)[keyof typeof SERVICE_GUIDE_PROVIDERS];

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 5000;
export const DEFAULT_CACHE_TTL_MS = 3_600_000;
