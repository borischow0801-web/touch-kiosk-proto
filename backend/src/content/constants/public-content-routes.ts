/** 群众端政务公开路由与 content_type 集中映射（api-spec §十四） */
export interface PublicContentRouteConfig {
  pathSegment: string;
  contentType: string;
  supportsDetail: boolean;
}

export const PUBLIC_CONTENT_ROUTES: readonly PublicContentRouteConfig[] = [
  { pathSegment: 'policies', contentType: 'policy_file', supportsDetail: true },
  { pathSegment: 'interpretations', contentType: 'policy_interpretation', supportsDetail: true },
  { pathSegment: 'open-guide', contentType: 'open_guide', supportsDetail: false },
  { pathSegment: 'open-system', contentType: 'open_system', supportsDetail: false },
  { pathSegment: 'open-catalog', contentType: 'open_catalog', supportsDetail: false },
  { pathSegment: 'annual-reports', contentType: 'annual_report', supportsDetail: false },
  { pathSegment: 'organizations', contentType: 'organization', supportsDetail: true },
  { pathSegment: 'faqs', contentType: 'faq', supportsDetail: true },
  { pathSegment: 'notices', contentType: 'notice', supportsDetail: true },
] as const;

const ROUTE_BY_SEGMENT = new Map(
  PUBLIC_CONTENT_ROUTES.map((route) => [route.pathSegment, route]),
);

export function getPublicContentRoute(pathSegment: string): PublicContentRouteConfig | undefined {
  return ROUTE_BY_SEGMENT.get(pathSegment);
}

export function getPublicContentRouteOrFail(pathSegment: string): PublicContentRouteConfig {
  const route = getPublicContentRoute(pathSegment);
  if (!route) {
    throw new Error(`未注册的群众端内容路由: ${pathSegment}`);
  }
  return route;
}
