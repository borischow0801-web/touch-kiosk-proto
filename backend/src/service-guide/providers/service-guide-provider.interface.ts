import type {
  UpstreamItemDetail,
  UpstreamItemQueryParams,
  UpstreamItemListResult,
  UpstreamItemType,
} from '../types/upstream.types';

export interface ServiceGuideProvider {
  readonly providerId: string;
  readonly isDevelopmentMock: boolean;

  fetchDeptItemTypes(deptCode: string): Promise<UpstreamItemType[]>;

  fetchThemeItemTypes(
    themeCode: string,
    internalThemeParam: string | null,
  ): Promise<UpstreamItemType[]>;

  fetchItemListScope(params: UpstreamItemQueryParams): Promise<UpstreamItemListResult>;

  fetchItemDetail(itemId: string): Promise<UpstreamItemDetail>;
}
