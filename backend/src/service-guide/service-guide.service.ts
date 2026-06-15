import { Injectable } from '@nestjs/common';
import { createPageResult, type PageResult } from '../common/dto/page-result.dto';
import { normalizeRelatedIdsForResponse } from '../guide-config/utils/related-ids.util';
import { GuideCacheService } from './cache/guide-cache.service';
import type { ItemsQueryDto } from './dto/items-query.dto';
import { GuideRelatedContentService } from './guide-related-content.service';
import { PublicGuideConfigService } from './public-guide-config.service';
import {
  DEFAULT_CACHE_TTL_MS,
  SERVICE_GUIDE_API_NAMES,
} from './constants/service-guide.constants';
import { ServiceGuideProviderFactory } from './providers/service-guide-provider.factory';
import { paginateFilteredList } from './guide-public-item-pagination.util';
import type {
  PublicDept,
  PublicItem,
  PublicItemDetailDto,
  PublicItemType,
  PublicTheme,
} from './types/public-service-guide.types';
import { mapUpstreamDetailToPublic } from './service-guide-detail.mapper';

export type {
  PublicDept,
  PublicItem,
  PublicItemDetailDto,
  PublicItemType,
  PublicTheme,
} from './types/public-service-guide.types';

@Injectable()
export class ServiceGuideService {
  constructor(
    private readonly configService: PublicGuideConfigService,
    private readonly cacheService: GuideCacheService,
    private readonly providerFactory: ServiceGuideProviderFactory,
    private readonly relatedContent: GuideRelatedContentService,
  ) {}

  async existsItemId(id: string): Promise<boolean> {
    return this.configService.existsItemId(id);
  }

  async existsDeptCode(code: string): Promise<boolean> {
    return this.configService.existsDeptCode(code);
  }

  async existsThemeCode(code: string): Promise<boolean> {
    return this.configService.existsThemeCode(code);
  }

  existsItemTypeCode(code: string): boolean {
    return this.configService.existsItemTypeCode(code);
  }

  async getDepts(hot?: string, requestId = '-'): Promise<PublicDept[]> {
    void requestId;
    return this.configService.listPublicDepts(hot);
  }

  async getThemes(hot?: string, requestId = '-'): Promise<PublicTheme[]> {
    void requestId;
    return this.configService.listPublicThemes(hot);
  }

  async getItemTypes(
    code: string,
    by: 'dept' | 'theme',
    requestId = '-',
  ): Promise<PublicItemType[]> {
    const runtime = this.providerFactory.getConfig();
    const provider = this.providerFactory.getProvider();

    if (by === 'dept') {
      const dept = await this.configService.requireActiveDept(code);
      return this.cacheService.executeWithCache({
        apiName: SERVICE_GUIDE_API_NAMES.DEPT_ITEM_TYPES,
        params: { deptCode: dept.deptCode },
        requestId,
        timeoutMs: runtime.upstreamTimeoutMs,
        ttlMs: DEFAULT_CACHE_TTL_MS,
        fetcher: () => provider.fetchDeptItemTypes(dept.deptCode),
      });
    }

    const theme = await this.configService.requireVisibleTheme(code);
    const internalThemeParam = theme.platformParamJson?.trim() || null;
    return this.cacheService.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.THEME_ITEM_TYPES,
      params: { themeCode: theme.themeCode, internalThemeParam },
      requestId,
      timeoutMs: runtime.upstreamTimeoutMs,
      ttlMs: DEFAULT_CACHE_TTL_MS,
      fetcher: () => provider.fetchThemeItemTypes(theme.themeCode, internalThemeParam),
    });
  }

  async getItems(
    query: ItemsQueryDto,
    requestId = '-',
  ): Promise<PageResult<PublicItem>> {
    const runtime = this.providerFactory.getConfig();
    const provider = this.providerFactory.getProvider();

    if (query.deptCode) {
      await this.configService.requireActiveDept(query.deptCode);
    }
    if (query.themeCode) {
      await this.configService.requireVisibleTheme(query.themeCode);
    }

    const scopeParams: Record<string, unknown> = {};
    if (query.deptCode) scopeParams.deptCode = query.deptCode;
    if (query.themeCode) scopeParams.themeCode = query.themeCode;
    if (query.itemTypeCode) scopeParams.itemTypeCode = query.itemTypeCode;

    const upstream = await this.cacheService.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.ITEM_LIST,
      params: scopeParams,
      requestId,
      timeoutMs: runtime.upstreamTimeoutMs,
      ttlMs: DEFAULT_CACHE_TTL_MS,
      fetcher: () =>
        provider.fetchItemListScope({
          deptCode: query.deptCode,
          themeCode: query.themeCode,
          itemTypeCode: query.itemTypeCode,
        }),
    });

    const visibleList = await this.configService.filterPublicItems(upstream.list);
    const paged = paginateFilteredList(visibleList, query.page, query.pageSize);
    const list = await this.configService.enrichItemsWithConfigFlags(paged.list);
    return createPageResult(list, paged.total, paged.page, paged.pageSize);
  }

  async getItemDetail(itemId: string, requestId = '-'): Promise<PublicItemDetailDto> {
    await this.configService.requirePublicItem(itemId);

    const runtime = this.providerFactory.getConfig();
    const provider = this.providerFactory.getProvider();

    const upstream = await this.cacheService.executeWithCache({
      apiName: SERVICE_GUIDE_API_NAMES.ITEM_DETAIL,
      params: { itemId },
      requestId,
      timeoutMs: runtime.upstreamTimeoutMs,
      ttlMs: DEFAULT_CACHE_TTL_MS,
      fetcher: () => provider.fetchItemDetail(itemId),
    });

    const cfg = await this.configService.findVisibleItemConfigByPlatformId(itemId);
    const policyIds = normalizeRelatedIdsForResponse(cfg?.relatedPolicyIds);
    const faqIds = normalizeRelatedIdsForResponse(cfg?.relatedFaqIds);
    const [policies, faqs] = await Promise.all([
      this.relatedContent.loadPublishedPolicies(policyIds),
      this.relatedContent.loadPublishedFaqs(faqIds),
    ]);

    return mapUpstreamDetailToPublic(upstream, { policies, faqs });
  }
}
