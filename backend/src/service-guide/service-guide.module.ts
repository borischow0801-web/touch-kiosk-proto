import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { GuideApiCache } from '../database/entities/guide-api-cache.entity';
import { GuideDeptMapping } from '../database/entities/guide-dept-mapping.entity';
import { GuideItemConfig } from '../database/entities/guide-item-config.entity';
import { GuideThemeMapping } from '../database/entities/guide-theme-mapping.entity';
import { GuideCacheService } from './cache/guide-cache.service';
import { GuideRelatedContentService } from './guide-related-content.service';
import { PublicGuideConfigService } from './public-guide-config.service';
import { ServiceGuideProviderFactory } from './providers/service-guide-provider.factory';
import { ServiceGuideService } from './service-guide.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuideDeptMapping,
      GuideThemeMapping,
      GuideItemConfig,
      GuideApiCache,
      ContentItem,
      ContentVersion,
    ]),
  ],
  providers: [
    ServiceGuideProviderFactory,
    GuideCacheService,
    PublicGuideConfigService,
    GuideRelatedContentService,
    ServiceGuideService,
  ],
  exports: [ServiceGuideService],
})
export class ServiceGuideModule {}
