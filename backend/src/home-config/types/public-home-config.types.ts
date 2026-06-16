export interface PublicHomeModuleItem {
  moduleCode: string;
  moduleName: string;
  moduleType: string;
  icon: string | null;
  color: string | null;
  layoutType: string | null;
  targetType: string;
  targetValue: string;
}

export interface PublicHomeHotItem {
  itemId: string;
  name: string;
}

export interface PublicNoticeSummary {
  id: string;
  title: string;
  summary: string | null;
  publishAt: Date | null;
}

export interface PublicNavItem {
  label: string;
  to: string;
}

export interface PublicHomeConfigResponse {
  title: string;
  subtitle: string | null;
  idleSeconds: number;
  bannerLines: string[];
  theme: Record<string, unknown>;
  modules: PublicHomeModuleItem[];
  homeHotItems: PublicHomeHotItem[];
  noticeSummaries: PublicNoticeSummary[];
  nav: PublicNavItem[];
}

export const DEFAULT_PUBLIC_HOME_NAV: PublicNavItem[] = [
  { label: '首页', to: '/home' },
  { label: '返回', to: 'BACK' },
  { label: '重来', to: '/home?reset=1' },
  { label: '帮助', to: '/help' },
];

export const DEFAULT_IDLE_SECONDS = 90;

export const PUBLIC_HOME_UNAVAILABLE_MESSAGE = '首页配置暂不可用，请稍后再试';
