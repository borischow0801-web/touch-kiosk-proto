import { Injectable } from '@nestjs/common';
import { ServiceGuideProviderNotConfiguredError } from './service-guide-provider.error';
import type { ServiceGuideProvider } from './service-guide-provider.interface';
import { SERVICE_GUIDE_PROVIDERS } from '../constants/service-guide.constants';
import type {
  UpstreamItemDetail,
  UpstreamItemQueryParams,
  UpstreamItemListResult,
  UpstreamItemType,
} from '../types/upstream.types';

@Injectable()
export class RealServiceGuideProvider implements ServiceGuideProvider {
  readonly providerId = SERVICE_GUIDE_PROVIDERS.REAL;
  readonly isDevelopmentMock = false;

  constructor(private readonly baseUrl: string | undefined) {
    if (!baseUrl?.trim()) {
      throw new ServiceGuideProviderNotConfiguredError(
        'SERVICE_GUIDE_PROVIDER=real requires SERVICE_GUIDE_UPSTREAM_BASE_URL. ' +
          'No real shared-platform API specification is available yet — refusing to guess protocol.',
      );
    }
  }

  private reject(): never {
    throw new ServiceGuideProviderNotConfiguredError(
      'Real shared-platform ServiceGuideProvider is not implemented. ' +
        'Formal upstream API documentation and credentials are required before enabling real provider.',
    );
  }

  async fetchDeptItemTypes(_deptCode: string): Promise<UpstreamItemType[]> {
    return this.reject();
  }

  async fetchThemeItemTypes(
    _themeCode: string,
    _internalThemeParam: string | null,
  ): Promise<UpstreamItemType[]> {
    return this.reject();
  }

  async fetchItemListScope(_params: UpstreamItemQueryParams): Promise<UpstreamItemListResult> {
    return this.reject();
  }

  async fetchItemDetail(_itemId: string): Promise<UpstreamItemDetail> {
    return this.reject();
  }
}
