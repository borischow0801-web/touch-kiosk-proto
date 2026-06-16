import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { GuideItemConfig } from '../database/entities/guide-item-config.entity';
import { HomeConfig } from '../database/entities/home-config.entity';
import { HomeConfigVersion } from '../database/entities/home-config-version.entity';
import { HomeModule } from '../database/entities/home-module.entity';
import { PublishRecord } from '../database/entities/publish-record.entity';
import { HomeConfigService } from './home-config.service';
import { HomeConfigPublishService } from './home-config-publish.service';
import { PublicHomeConfigService } from './public-home-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HomeConfig,
      HomeConfigVersion,
      HomeModule,
      PublishRecord,
      GuideItemConfig,
      ContentItem,
      ContentVersion,
    ]),
  ],
  providers: [HomeConfigService, HomeConfigPublishService, PublicHomeConfigService],
  exports: [HomeConfigService, HomeConfigPublishService, PublicHomeConfigService],
})
export class HomeConfigModule {}
