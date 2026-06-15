import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { normalizeGuideCode } from '../../guide-config/utils/normalize-guide-code.util';
import {
  DEVELOPMENT_MOCK_ITEM_DETAILS,
  DEVELOPMENT_MOCK_ITEM_TYPES,
  DEVELOPMENT_MOCK_ITEMS,
  DEVELOPMENT_MOCK_MARKER,
} from './development-mock.catalog';
import type { ServiceGuideProvider } from './service-guide-provider.interface';
import { SERVICE_GUIDE_PROVIDERS } from '../constants/service-guide.constants';
import type {
  UpstreamItemDetail,
  UpstreamItemQueryParams,
  UpstreamItemListResult,
  UpstreamItemType,
} from '../types/upstream.types';

@Injectable()
export class DevelopmentMockServiceGuideProvider implements ServiceGuideProvider {
  readonly providerId = SERVICE_GUIDE_PROVIDERS.DEVELOPMENT;
  readonly isDevelopmentMock = true;

  private readonly logger = new Logger(DevelopmentMockServiceGuideProvider.name);

  constructor() {
    this.logger.warn(
      `ServiceGuideProvider=${SERVICE_GUIDE_PROVIDERS.DEVELOPMENT} — using ${DEVELOPMENT_MOCK_MARKER}`,
    );
  }

  async fetchDeptItemTypes(deptCode: string): Promise<UpstreamItemType[]> {
    const normalized = normalizeGuideCode(deptCode);
    const usedCodes = new Set(
      DEVELOPMENT_MOCK_ITEMS
        .filter((i) => normalizeGuideCode(i.deptCode) === normalized)
        .map((i) => i.itemTypeCode)
        .filter((c): c is string => Boolean(c)),
    );
    return DEVELOPMENT_MOCK_ITEM_TYPES.filter((t) => usedCodes.has(t.code));
  }

  async fetchThemeItemTypes(
    themeCode: string,
    _internalThemeParam: string | null,
  ): Promise<UpstreamItemType[]> {
    const normalized = normalizeGuideCode(themeCode);
    const usedCodes = new Set(
      DEVELOPMENT_MOCK_ITEMS
        .filter((i) => normalizeGuideCode(i.themeCode) === normalized)
        .map((i) => i.itemTypeCode)
        .filter((c): c is string => Boolean(c)),
    );
    return DEVELOPMENT_MOCK_ITEM_TYPES.filter((t) => usedCodes.has(t.code));
  }

  async fetchItemListScope(params: UpstreamItemQueryParams): Promise<UpstreamItemListResult> {
    let list = [...DEVELOPMENT_MOCK_ITEMS];
    if (params.deptCode) {
      const dept = normalizeGuideCode(params.deptCode);
      list = list.filter((i) => normalizeGuideCode(i.deptCode) === dept);
    }
    if (params.themeCode) {
      const theme = normalizeGuideCode(params.themeCode);
      list = list.filter((i) => normalizeGuideCode(i.themeCode) === theme);
    }
    if (params.itemTypeCode) list = list.filter((i) => i.itemTypeCode === params.itemTypeCode);
    return { list, total: list.length };
  }

  async fetchItemDetail(itemId: string): Promise<UpstreamItemDetail> {
    const found = DEVELOPMENT_MOCK_ITEM_DETAILS[itemId];
    if (!found) {
      throw new NotFoundException(`事项 ${itemId} 不存在`);
    }
    return found;
  }
}
