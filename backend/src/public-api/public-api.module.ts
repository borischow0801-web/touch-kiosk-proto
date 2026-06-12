import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { HomeConfigModule } from '../home-config/home-config.module';
import { ServiceGuideModule } from '../service-guide/service-guide.module';
import { StatsModule } from '../stats/stats.module';
import { HomeController } from './controllers/home.controller';
import { PublicContentController } from './controllers/public-content.controller';
import { ServiceGuideController } from './controllers/service-guide.controller';
import { StatsController } from './controllers/stats.controller';

@Module({
  imports: [ContentModule, HomeConfigModule, ServiceGuideModule, StatsModule],
  controllers: [
    HomeController,
    PublicContentController,
    ServiceGuideController,
    StatsController,
  ],
})
export class PublicApiModule {}
