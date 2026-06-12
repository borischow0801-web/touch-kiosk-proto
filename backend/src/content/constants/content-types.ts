/** 一期 content_item / content_category 允许的内容类型（与 database.md / architecture.md 基线一致，共 9 类） */
export const ALLOWED_CONTENT_TYPES = new Set([
  'policy_file',
  'policy_interpretation',
  'open_guide',
  'open_system',
  'open_catalog',
  'annual_report',
  'organization',
  'faq',
  'notice',
] as const);

export type ContentType = typeof ALLOWED_CONTENT_TYPES extends Set<infer T> ? T : never;
