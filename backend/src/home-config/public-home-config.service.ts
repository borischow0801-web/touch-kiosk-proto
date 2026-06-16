import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { GuideItemConfig } from '../database/entities/guide-item-config.entity';
import { HomeConfig } from '../database/entities/home-config.entity';
import { HomeConfigVersion } from '../database/entities/home-config-version.entity';
import { HomeModule } from '../database/entities/home-module.entity';
import { DEFAULT_HOME_CONFIG_NAME } from './home-config.service';
import {
  DEFAULT_IDLE_SECONDS,
  DEFAULT_PUBLIC_HOME_NAV,
  PUBLIC_HOME_UNAVAILABLE_MESSAGE,
  PublicHomeConfigResponse,
  PublicHomeHotItem,
  PublicHomeModuleItem,
  PublicNoticeSummary,
} from './types/public-home-config.types';

const PUBLISHED_STATUS = 'published';
const NOTICES_CONTENT_TYPE = 'notices';
const NOTICE_SUMMARY_LIMIT = 5;

@Injectable()
export class PublicHomeConfigService {
  private readonly logger = new Logger(PublicHomeConfigService.name);

  constructor(
    @InjectRepository(HomeConfig)
    private readonly configRepo: Repository<HomeConfig>,
    @InjectRepository(HomeConfigVersion)
    private readonly versionRepo: Repository<HomeConfigVersion>,
    @InjectRepository(HomeModule)
    private readonly moduleRepo: Repository<HomeModule>,
    @InjectRepository(GuideItemConfig)
    private readonly guideItemRepo: Repository<GuideItemConfig>,
    @InjectRepository(ContentItem)
    private readonly contentItemRepo: Repository<ContentItem>,
  ) {}

  async getConfig(): Promise<PublicHomeConfigResponse> {
    const version = await this.loadPublishedVersionOrFail();
    const [modules, homeHotItems, noticeSummaries] = await Promise.all([
      this.loadVisibleModules(version.id),
      this.loadHomeHotItems(),
      this.loadNoticeSummaries(),
    ]);

    return {
      title: version.title,
      subtitle: version.subtitle,
      idleSeconds: DEFAULT_IDLE_SECONDS,
      bannerLines: this.parseBannerLines(version.topBannerJson),
      theme: this.parseTheme(version.themeJson),
      modules,
      homeHotItems,
      noticeSummaries,
      nav: [...DEFAULT_PUBLIC_HOME_NAV],
    };
  }

  private async loadPublishedVersionOrFail(): Promise<HomeConfigVersion> {
    const config = await this.configRepo.findOne({
      where: { configName: DEFAULT_HOME_CONFIG_NAME, status: PUBLISHED_STATUS },
    });
    if (!config || !config.currentVersionId) {
      throw new ServiceUnavailableException(PUBLIC_HOME_UNAVAILABLE_MESSAGE);
    }

    const version = await this.versionRepo.findOne({
      where: {
        id: config.currentVersionId,
        homeConfigId: config.id,
        status: PUBLISHED_STATUS,
      },
    });
    if (!version) {
      throw new ServiceUnavailableException(PUBLIC_HOME_UNAVAILABLE_MESSAGE);
    }

    return version;
  }

  private async loadVisibleModules(versionId: string): Promise<PublicHomeModuleItem[]> {
    const rows = await this.moduleRepo.find({
      where: { homeConfigVersionId: versionId, isVisible: 1 },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((mod) => this.toPublicModule(mod));
  }

  private async loadHomeHotItems(): Promise<PublicHomeHotItem[]> {
    const rows = await this.guideItemRepo
      .createQueryBuilder('item')
      .where('item.is_visible = :visible', { visible: 1 })
      .andWhere('(item.is_hot = :hot OR item.is_recommend = :recommend)', {
        hot: 1,
        recommend: 1,
      })
      .orderBy('item.sort_order', 'ASC')
      .addOrderBy('item.created_at', 'ASC')
      .getMany();

    return rows.map((item) => ({
      itemId: item.platformItemId,
      name: item.displayName?.trim() || item.itemName,
    }));
  }

  private async loadNoticeSummaries(): Promise<PublicNoticeSummary[]> {
    const rows = await this.contentItemRepo
      .createQueryBuilder('item')
      .innerJoin(
        ContentVersion,
        'version',
        'version.id = item.current_version_id AND version.status = :versionStatus',
        { versionStatus: PUBLISHED_STATUS },
      )
      .where('item.content_type = :contentType', { contentType: NOTICES_CONTENT_TYPE })
      .andWhere('item.status = :itemStatus', { itemStatus: PUBLISHED_STATUS })
      .andWhere('item.current_version_id IS NOT NULL')
      .orderBy('item.publish_at', 'DESC')
      .addOrderBy('item.updated_at', 'DESC')
      .select([
        'item.id AS id',
        'version.title AS title',
        'version.summary AS summary',
        'item.publish_at AS publishAt',
      ])
      .limit(NOTICE_SUMMARY_LIMIT)
      .getRawMany<PublicNoticeSummary>();

    return rows;
  }

  private toPublicModule(mod: HomeModule): PublicHomeModuleItem {
    return {
      moduleCode: mod.moduleCode,
      moduleName: mod.moduleName,
      moduleType: mod.moduleType,
      icon: mod.icon,
      color: mod.color,
      layoutType: mod.layoutType,
      targetType: mod.targetType,
      targetValue: mod.targetValue,
    };
  }

  private parseBannerLines(json: string | null): string[] {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!Array.isArray(parsed)) {
        this.logger.warn('top_banner_json is not an array, returning empty bannerLines');
        return [];
      }
      return parsed.filter((line): line is string => typeof line === 'string');
    } catch {
      this.logger.warn('Failed to parse top_banner_json, returning empty bannerLines');
      return [];
    }
  }

  private parseTheme(json: string | null): Record<string, unknown> {
    if (!json) return {};
    try {
      const parsed = JSON.parse(json) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        this.logger.warn('theme_json is not an object, returning empty theme');
        return {};
      }
      return parsed as Record<string, unknown>;
    } catch {
      this.logger.warn('Failed to parse theme_json, returning empty theme');
      return {};
    }
  }
}
